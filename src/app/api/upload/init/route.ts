import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { pickDrive } from "@/lib/drive/router";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { ALLOWED_MIME_TYPES } from "@/types";

/** POST /api/upload/init — Initialize resumable upload */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { fileName, mimeType, fileSize } = body as {
        fileName: string;
        mimeType: string;
        fileSize?: number;
    };

    if (!fileName || !mimeType) {
        return NextResponse.json(
            { error: "fileName dan mimeType wajib diisi" },
            { status: 400 }
        );
    }

    // Validate MIME type
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
        return NextResponse.json(
            { error: `Tipe file tidak didukung: ${mimeType}` },
            { status: 400 }
        );
    }

    // Validate file extension matches MIME type
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const MIME_EXT_MAP: Record<string, string[]> = {
        "application/pdf": ["pdf"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
        "text/plain": ["txt"],
        "image/png": ["png"],
        "image/jpeg": ["jpg", "jpeg"],
        "application/zip": ["zip"],
    };
    const allowedExts = MIME_EXT_MAP[mimeType];
    if (allowedExts && !allowedExts.includes(ext)) {
        return NextResponse.json(
            { error: `Ekstensi file .${ext} tidak sesuai dengan tipe ${mimeType}` },
            { status: 400 }
        );
    }

    // Pick best drive
    const driveId = await pickDrive();
    if (!driveId) {
        return NextResponse.json(
            { error: "Semua drive penuh atau tidak tersedia" },
            { status: 503 }
        );
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin;

    // Initialize resumable upload session on Google Drive
    try {
        const adapter = getDriveAdapter();
        const { uploadUri } = await adapter.initResumableUpload(
            driveId,
            fileName,
            mimeType,
            fileSize,
            origin
        );

        return NextResponse.json({
            driveId,
            uploadUri,
        });
    } catch (err) {
        console.error("[UploadInit] Failed to initiate resumable upload:", err);
        return NextResponse.json(
            { error: "Gagal menginisialisasi upload. Coba lagi." },
            { status: 500 }
        );
    }
}
