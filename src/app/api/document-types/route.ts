import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { documentTypes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const PRIVATE_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=900";

/** GET /api/document-types — Active document types for upload/edit forms */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const types = await db
        .select({
            id: documentTypes.id,
            code: documentTypes.code,
            label: documentTypes.label,
            isSystem: documentTypes.isSystem,
            isActive: documentTypes.isActive,
            sortOrder: documentTypes.sortOrder,
        })
        .from(documentTypes)
        .where(eq(documentTypes.isActive, 1))
        .orderBy(asc(documentTypes.sortOrder), asc(documentTypes.code));

    const headers = new Headers();
    headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    headers.set("Vary", "Cookie");

    return NextResponse.json({ types }, { headers });
}
