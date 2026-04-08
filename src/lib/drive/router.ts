import { getDb } from "@/lib/db";
import { driveUsage } from "@/db/schema";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { eq } from "drizzle-orm";

type DriveAccountId = "A" | "B";

const DRIVE_IDS: DriveAccountId[] = ["A", "B"];
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_REMAINING_BYTES = 100 * 1024 * 1024; // 100 MB

interface DriveUsageInfo {
    driveId: DriveAccountId;
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    updatedAt: number;
}

/**
 * Pick the best drive for the next upload.
 * Per rules.md §6.3:
 * - Read cached usage from drive_usage first (within 30 min)
 * - If stale, query Drive API and update cache
 * - Exclude drives with < 100 MB remaining
 * - Exclude drives whose API query failed
 */
export async function pickDrive(): Promise<DriveAccountId | null> {
    const db = getDb();
    const adapter = getDriveAdapter();
    const now = Date.now();
    const usageInfos: DriveUsageInfo[] = [];

    for (const driveId of DRIVE_IDS) {
        try {
            // Check cache
            const cached = await db
                .select()
                .from(driveUsage)
                .where(eq(driveUsage.driveId, driveId))
                .limit(1);

            let used: number;
            let total: number;

            if (cached.length > 0 && now - cached[0].updatedAt < CACHE_TTL_MS) {
                // Cache is fresh
                used = cached[0].usedBytes;
                total = cached[0].totalBytes;
            } else {
                // Cache stale or missing — fetch from Drive API
                const apiUsage = await adapter.getUsage(driveId);
                if (!apiUsage) {
                    console.warn(
                        `[DriveRouter] API query failed for Drive ${driveId}, skipping`
                    );
                    continue;
                }

                used = apiUsage.used;
                total = apiUsage.total;

                // Update cache
                if (cached.length > 0) {
                    await db
                        .update(driveUsage)
                        .set({ usedBytes: used, totalBytes: total, updatedAt: now })
                        .where(eq(driveUsage.driveId, driveId));
                } else {
                    await db.insert(driveUsage).values({
                        driveId,
                        usedBytes: used,
                        totalBytes: total,
                        updatedAt: now,
                    });
                }
            }

            const freeBytes = total - used;

            // Exclude drives with < 100 MB remaining
            if (freeBytes < MIN_REMAINING_BYTES) {
                continue;
            }

            usageInfos.push({ driveId, usedBytes: used, totalBytes: total, freeBytes, updatedAt: now });
        } catch (err) {
            console.warn(
                `[DriveRouter] Error checking Drive ${driveId}:`,
                err
            );
            continue;
        }
    }

    if (usageInfos.length === 0) {
        return null; // All drives full or unreachable
    }

    // Pick drive with most free space
    usageInfos.sort((a, b) => b.freeBytes - a.freeBytes);
    return usageInfos[0].driveId;
}
