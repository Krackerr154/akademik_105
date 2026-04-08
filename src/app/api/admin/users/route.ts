import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** GET /api/admin/users — List all active users */
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
    const allUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
}
