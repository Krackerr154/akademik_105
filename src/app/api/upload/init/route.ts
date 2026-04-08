import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { pickDrive } from "@/lib/drive/router";

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
    const { fileName, mimeType } = body as { fileName: string; mimeType: string };

    if (!fileName || !mimeType) {
        return NextResponse.json({ error: "fileName dan mimeType wajib diisi" }, { status: 400 });
    }

    // Pick best drive
    const driveId = await pickDrive();
    if (!driveId) {
        return NextResponse.json(
            { error: "Semua drive penuh atau tidak tersedia" },
            { status: 503 }
        );
    }

    return NextResponse.json({
        driveId,
        message: "Upload siap. Gunakan endpoint upload/complete setelah file berhasil diunggah.",
    });
}
