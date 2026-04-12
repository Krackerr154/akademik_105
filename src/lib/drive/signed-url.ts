import { getDriveAdapter } from "@/lib/drive/adapter";
import { getDb } from "@/lib/db";
import { auditLog } from "@/db/schema";

/**
 * Generate a download URL for a file on Google Drive.
 * Per rules.md §6.4:
 * - Server-side only
 * - Log every download to audit_log
 */
export async function generateSignedUrl(
    driveId: string,
    gdriveFileId: string,
    userId: string,
    fileId: string
): Promise<string | null> {
    const adapter = getDriveAdapter();
    const downloadUrl = await adapter.getDownloadUrl(
        driveId as "A" | "B",
        gdriveFileId
    );

    if (!downloadUrl) return null;

    // Log download to audit
    const db = getDb();
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId,
        action: "download",
        targetId: fileId,
        metadata: JSON.stringify({ driveId }),
        createdAt: Date.now(),
    });

    return downloadUrl;
}

/**
 * Generate a preview URL for a file on Google Drive.
 * Per rules.md §6.4:
 * - Server-side only
 * - Log every preview to audit_log
 */
export async function generatePreviewUrl(
    driveId: string,
    gdriveFileId: string,
    userId: string,
    fileId: string
): Promise<string | null> {
    const adapter = getDriveAdapter();
    const previewUrl = await adapter.getPreviewUrl(
        driveId as "A" | "B",
        gdriveFileId
    );

    if (!previewUrl) return null;

    // Log preview to audit
    const db = getDb();
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId,
        action: "preview",
        targetId: fileId,
        metadata: JSON.stringify({ driveId }),
        createdAt: Date.now(),
    });

    return previewUrl;
}
