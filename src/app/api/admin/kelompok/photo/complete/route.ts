import { auth } from "@/lib/auth";
import { getDriveAdapter } from "@/lib/drive/adapter";
import {
    hasMinRole,
    KELOMPOK_PHOTO_ALLOWED_MIME_TYPES,
    MAX_KELOMPOK_PHOTO_SIZE,
} from "@/types";
import { NextRequest, NextResponse } from "next/server";

function ensureAdmin(user: { role?: string; status?: string }) {
    return user.status === "active" && hasMinRole(user.role ?? "", "admin");
}

function toPhotoUrl(driveId: "A" | "B", fileId: string): string {
    const params = new URLSearchParams({
        driveId,
        fileId,
    });
    return `/api/kelompok/photo?${params.toString()}`;
}

/** POST /api/admin/kelompok/photo/complete */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; status?: string };
    if (!ensureAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    const driveIdRaw =
        typeof body?.driveId === "string" ? body.driveId.trim().toUpperCase() : "";
    const driveId = driveIdRaw === "A" || driveIdRaw === "B" ? driveIdRaw : null;

    const mimeType =
        typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const uploadStartedAt =
        typeof body?.uploadStartedAt === "number" ? body.uploadStartedAt : undefined;

    const rawSize = body?.sizeBytes;
    const sizeBytes = typeof rawSize === "number" ? rawSize : Number(rawSize ?? Number.NaN);

    const providedFileId =
        typeof body?.gdriveFileId === "string" ? body.gdriveFileId.trim() : "";

    if (!driveId || !mimeType || !fileName || !Number.isFinite(sizeBytes)) {
        return NextResponse.json(
            {
                error: "driveId, mimeType, fileName, dan sizeBytes wajib diisi",
            },
            { status: 400 }
        );
    }

    if (sizeBytes <= 0) {
        return NextResponse.json({ error: "Ukuran file tidak valid" }, { status: 400 });
    }

    if (sizeBytes > MAX_KELOMPOK_PHOTO_SIZE) {
        return NextResponse.json(
            {
                error: `Ukuran foto maksimal ${Math.floor(
                    MAX_KELOMPOK_PHOTO_SIZE / (1024 * 1024)
                )} MB`,
            },
            { status: 400 }
        );
    }

    if (!(KELOMPOK_PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
        return NextResponse.json(
            { error: `Tipe foto tidak didukung: ${mimeType}` },
            { status: 400 }
        );
    }

    const adapter = getDriveAdapter();
    let resolvedFileId = providedFileId || null;

    if (!resolvedFileId) {
        const uploadedAfterMs =
            typeof uploadStartedAt === "number"
                ? Math.max(uploadStartedAt - 60_000, 0)
                : undefined;

        resolvedFileId = await adapter.findRecentFileIdByNameAndSize(
            driveId,
            fileName,
            sizeBytes,
            uploadedAfterMs
        );
    }

    if (!resolvedFileId) {
        return NextResponse.json(
            {
                error:
                    "Upload foto selesai, tapi ID file tidak terbaca. Silakan unggah ulang.",
            },
            { status: 502 }
        );
    }

    const driveFile = await adapter.getFile(driveId, resolvedFileId);
    if (!driveFile) {
        return NextResponse.json(
            { error: "Foto tidak ditemukan di Google Drive" },
            { status: 400 }
        );
    }

    const photoUrl = toPhotoUrl(driveId, resolvedFileId);

    return NextResponse.json({
        success: true,
        driveId,
        gdriveFileId: resolvedFileId,
        photoUrl,
    });
}
