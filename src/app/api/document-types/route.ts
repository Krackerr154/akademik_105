import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { documentTypes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

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

    return NextResponse.json({ types });
}
