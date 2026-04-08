import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET /api/files — List all files (members) */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { status?: string; role?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    const allFiles = await db
        .select()
        .from(files)
        .orderBy(desc(files.createdAt))
        .limit(100);

    // Strip gdrive_file_id for non-admin
    const sanitized = allFiles.map((f) => {
        if (isAdmin) return f;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { gdriveFileId, ...rest } = f;
        return rest;
    });

    return NextResponse.json({ files: sanitized });
}
