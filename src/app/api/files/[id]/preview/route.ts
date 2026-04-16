import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generatePreviewUrl } from "@/lib/drive/signed-url";

const PRIVATE_CACHE_CONTROL = "private, max-age=60, must-revalidate";

function errorResponse(error: string, status: number, code: string) {
    return NextResponse.json({ error, code }, { status });
}

/** GET /api/files/[id]/preview */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active") {
        return errorResponse("Forbidden", 403, "FORBIDDEN_INACTIVE");
    }

    const db = getDb();
    const file = await db
        .select()
        .from(files)
        .where(eq(files.id, params.id))
        .limit(1);

    if (file.length === 0) {
        return errorResponse("File tidak ditemukan", 404, "FILE_NOT_FOUND");
    }

    const f = file[0];
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (f.visibility === "admin_only" && !isAdmin) {
        return errorResponse("Forbidden", 403, "FORBIDDEN_VISIBILITY");
    }

    const url = await generatePreviewUrl(
        f.driveId,
        f.gdriveFileId,
        user.id ?? "",
        f.id
    );

    if (!url) {
        return errorResponse(
            "Gagal membuat URL pratinjau",
            500,
            "PREVIEW_URL_FAILED"
        );
    }

    const headers = new Headers();
    headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    headers.set("Vary", "Cookie");

    return NextResponse.json({ url }, { headers });
}
