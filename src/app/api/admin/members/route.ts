import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pendingRegistrations } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** GET /api/admin/members — List pending registrations */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const members = await db
        .select()
        .from(pendingRegistrations)
        .orderBy(desc(pendingRegistrations.syncedAt));

    return NextResponse.json({ members });
}
