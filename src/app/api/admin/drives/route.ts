import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { getDb } from "@/lib/db";
import { driveUsage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasMinRole } from "@/types";

const DRIVE_IDS = ["A", "B"] as const;

/** GET /api/admin/drives — Drive usage statistics */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const adapter = getDriveAdapter();
    const now = Date.now();

    const results: Array<{
        driveId: string;
        usedBytes: number;
        totalBytes: number;
        freeBytes: number;
        updatedAt: number;
        status: "ok" | "error";
    }> = [];

    for (const driveId of DRIVE_IDS) {
        try {
            const apiUsage = await adapter.getUsage(driveId);
            if (apiUsage) {
                const free = apiUsage.total - apiUsage.used;

                // Upsert cache
                const cached = await db
                    .select()
                    .from(driveUsage)
                    .where(eq(driveUsage.driveId, driveId))
                    .limit(1);

                if (cached.length > 0) {
                    await db
                        .update(driveUsage)
                        .set({ usedBytes: apiUsage.used, totalBytes: apiUsage.total, updatedAt: now })
                        .where(eq(driveUsage.driveId, driveId));
                } else {
                    await db.insert(driveUsage).values({
                        driveId,
                        usedBytes: apiUsage.used,
                        totalBytes: apiUsage.total,
                        updatedAt: now,
                    });
                }

                results.push({
                    driveId,
                    usedBytes: apiUsage.used,
                    totalBytes: apiUsage.total,
                    freeBytes: free,
                    updatedAt: now,
                    status: "ok",
                });
            } else {
                // API failed — fallback to cache
                const cached = await db
                    .select()
                    .from(driveUsage)
                    .where(eq(driveUsage.driveId, driveId))
                    .limit(1);

                if (cached.length > 0) {
                    results.push({
                        driveId,
                        usedBytes: cached[0].usedBytes,
                        totalBytes: cached[0].totalBytes,
                        freeBytes: cached[0].totalBytes - cached[0].usedBytes,
                        updatedAt: cached[0].updatedAt,
                        status: "ok",
                    });
                } else {
                    results.push({ driveId, usedBytes: 0, totalBytes: 0, freeBytes: 0, updatedAt: 0, status: "error" });
                }
            }
        } catch {
            results.push({ driveId, usedBytes: 0, totalBytes: 0, freeBytes: 0, updatedAt: 0, status: "error" });
        }
    }

    return NextResponse.json({ drives: results });
}
