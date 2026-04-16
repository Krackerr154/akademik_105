import { auth } from "@/lib/auth";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { NextRequest, NextResponse } from "next/server";

function isValidDriveId(raw: string): raw is "A" | "B" {
    return raw === "A" || raw === "B";
}

/** GET /api/kelompok/photo?driveId=A|B&fileId=... */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driveIdRaw = (req.nextUrl.searchParams.get("driveId") ?? "").trim().toUpperCase();
    const fileId = (req.nextUrl.searchParams.get("fileId") ?? "").trim();

    if (!isValidDriveId(driveIdRaw) || !fileId) {
        return NextResponse.json(
            { error: "driveId dan fileId tidak valid" },
            { status: 400 }
        );
    }

    const adapter = getDriveAdapter();
    const media = await adapter.getFileMedia(driveIdRaw, fileId);

    if (!media) {
        return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
    }

    if (!media.mimeType.toLowerCase().startsWith("image/")) {
        return NextResponse.json(
            { error: "File bukan gambar yang didukung" },
            { status: 415 }
        );
    }

    const headers = new Headers();
    headers.set("Content-Type", media.mimeType);
    headers.set("Cache-Control", "private, max-age=300");
    headers.set("Content-Disposition", "inline");

    if (media.updatedTime) {
        const lastModified = new Date(media.updatedTime).toUTCString();
        headers.set("Last-Modified", lastModified);
    }

    const body = new Uint8Array(media.bytes).buffer;

    return new NextResponse(body, {
        status: 200,
        headers,
    });
}
