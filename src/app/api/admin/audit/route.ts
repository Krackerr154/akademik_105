import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** GET /api/admin/audit — List audit log entries */
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
    const logs = await db
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(200);

    return NextResponse.json({ logs });
}
