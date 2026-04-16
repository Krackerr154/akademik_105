import { auth } from "@/lib/auth";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { pickDrive } from "@/lib/drive/router";
import {
    hasMinRole,
    KELOMPOK_PHOTO_ALLOWED_MIME_TYPES,
    MAX_KELOMPOK_PHOTO_SIZE,
} from "@/types";
import { NextRequest, NextResponse } from "next/server";

const PHOTO_MIME_EXT_MAP: Record<string, string[]> = {
    "image/png": ["png"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"],
};

function ensureAdmin(user: { role?: string; status?: string }) {
    return user.status === "active" && hasMinRole(user.role ?? "", "admin");
}

function sanitizeFileBaseName(fileName: string): string {
    const withoutExt = fileName.replace(/\.[^/.]+$/, "").trim();
    const sanitized = withoutExt
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);

    return sanitized || "photo";
}

/** POST /api/admin/kelompok/photo/init */
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
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const mimeType =
        typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const rawFileSize = body?.fileSize;
    const fileSize =
        typeof rawFileSize === "number" ? rawFileSize : Number(rawFileSize ?? Number.NaN);

    if (!fileName || !mimeType || !Number.isFinite(fileSize)) {
        return NextResponse.json(
            { error: "fileName, mimeType, dan fileSize wajib diisi" },
            { status: 400 }
        );
    }

    if (fileSize <= 0) {
        return NextResponse.json({ error: "Ukuran file tidak valid" }, { status: 400 });
    }

    if (fileSize > MAX_KELOMPOK_PHOTO_SIZE) {
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

    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const allowedExts = PHOTO_MIME_EXT_MAP[mimeType] ?? [];
    if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
        return NextResponse.json(
            {
                error: `Ekstensi file .${ext || "?"} tidak sesuai dengan tipe ${mimeType}`,
            },
            { status: 400 }
        );
    }

    const baseName = sanitizeFileBaseName(fileName);
    const normalizedExt = allowedExts[0] ?? "jpg";
    const storedFileName = `kelompok-${baseName}-${Date.now()}.${normalizedExt}`;

    const driveId = await pickDrive();
    if (!driveId) {
        return NextResponse.json(
            { error: "Semua drive penuh atau tidak tersedia" },
            { status: 503 }
        );
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin;

    try {
        const adapter = getDriveAdapter();
        const { uploadUri } = await adapter.initResumableUpload(
            driveId,
            storedFileName,
            mimeType,
            fileSize,
            origin
        );

        return NextResponse.json({
            driveId,
            uploadUri,
            storedFileName,
        });
    } catch (err) {
        console.error("[KelompokPhotoInit] Failed to initiate upload:", err);
        return NextResponse.json(
            { error: "Gagal menginisialisasi upload foto. Coba lagi." },
            { status: 500 }
        );
    }
}
