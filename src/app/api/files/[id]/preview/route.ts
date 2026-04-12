import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { generatePreviewUrl } from "@/lib/drive/signed-url";

/** GET /api/files/[id]/preview */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const file = await db
        .select()
        .from(files)
        .where(eq(files.id, params.id))
        .limit(1);

    if (file.length === 0) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const f = file[0];
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (f.visibility === "admin_only" && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await generatePreviewUrl(
        f.driveId,
        f.gdriveFileId,
        user.id ?? "",
        f.id
    );

    if (!url) {
        return NextResponse.json(
            { error: "Gagal membuat URL pratinjau" },
            { status: 500 }
        );
    }

    return NextResponse.json({ url });
}
