import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, auditLog, documentTypes } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { hasMinRole, normalizeDocumentTypeCode } from "@/types";

/**
 * POST /api/upload/complete — Save metadata after client completes upload
 * Per rules.md §6.2: save drive_id + gdrive_file_id atomically
 * If DB write fails, delete the Drive file
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
        driveId,
        gdriveFileId,
        title,
        subject,
        docType,
        tags,
        abstract,
        year,
        authors,
        angkatanTags,
        mimeType,
        sizeBytes,
        sha256,
        visibility,
    } = body as {
        driveId: string;
        gdriveFileId: string;
        title: string;
        subject: string;
        docType: string;
        tags?: string;
        abstract?: string;
        year?: number;
        authors?: string;
        angkatanTags?: string;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
        visibility?: string;
    };

    if (!driveId || !gdriveFileId || !title || !subject || !docType || !mimeType || !sha256) {
        return NextResponse.json(
            { error: "Field wajib belum lengkap" },
            { status: 400 }
        );
    }

    // Validate MIME type
    const { ALLOWED_MIME_TYPES } = await import("@/types");
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
        return NextResponse.json(
            { error: `Tipe file tidak didukung: ${mimeType}` },
            { status: 400 }
        );
    }

    // Validate document type against active controlled vocabulary
    const normalizedDocType = normalizeDocumentTypeCode(docType);
    if (!normalizedDocType) {
        return NextResponse.json(
            { error: "Tipe dokumen wajib dipilih" },
            { status: 400 }
        );
    }

    // Verify file exists on Drive
    const adapter = getDriveAdapter();
    const driveFile = await adapter.getFile(
        driveId as "A" | "B",
        gdriveFileId
    );

    if (!driveFile) {
        return NextResponse.json(
            { error: "File tidak ditemukan di Google Drive" },
            { status: 400 }
        );
    }

    // Check SHA-256 duplicate
    const db = getDb();

    const validType = await db
        .select({ id: documentTypes.id })
        .from(documentTypes)
        .where(
            and(
                eq(documentTypes.code, normalizedDocType),
                eq(documentTypes.isActive, 1)
            )
        )
        .limit(1);

    if (validType.length === 0) {
        return NextResponse.json(
            { error: `Tipe dokumen tidak valid: ${normalizedDocType}` },
            { status: 400 }
        );
    }

    const duplicate = await db
        .select({ id: files.id })
        .from(files)
        .where(eq(files.sha256, sha256))
        .limit(1);

    if (duplicate.length > 0) {
        return NextResponse.json(
            { error: "File dengan konten yang sama sudah ada", existingId: duplicate[0].id },
            { status: 409 }
        );
    }

    const now = Date.now();
    const fileId = crypto.randomUUID();

    try {
        // Atomic DB write
        await db.insert(files).values({
            id: fileId,
            title,
            subject,
            docType: normalizedDocType,
            tags: tags ?? null,
            abstract: abstract ?? null,
            year: year ?? null,
            authors: authors ?? null,
            angkatanTags: angkatanTags ?? null,
            mimeType,
            sizeBytes,
            sha256,
            driveId,
            gdriveFileId,
            visibility: visibility ?? "members",
            uploaderId: user.id ?? "",
            createdAt: now,
            updatedAt: now,
        });

        // Audit log
        await db.insert(auditLog).values({
            id: crypto.randomUUID(),
            userId: user.id ?? null,
            action: "upload",
            targetId: fileId,
            metadata: JSON.stringify({ title, driveId, sizeBytes }),
            createdAt: now,
        });

        return NextResponse.json({ success: true, fileId });
    } catch (err) {
        // Per rules.md §6.2: if DB write fails, delete the Drive file
        console.error("[UploadComplete] DB write failed, deleting Drive file:", err);
        await adapter.deleteFile(driveId as "A" | "B", gdriveFileId);
        return NextResponse.json(
            { error: "Gagal menyimpan metadata. File telah dihapus dari Drive." },
            { status: 500 }
        );
    }
}
