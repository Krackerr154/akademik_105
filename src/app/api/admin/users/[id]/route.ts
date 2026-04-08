import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** PATCH /api/admin/users/[id] — Update user role or suspend */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { role, status } = body as { role?: string; status?: string };

    const db = getDb();
    const target = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id))
        .limit(1);

    if (target.length === 0) {
        return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const t = target[0];

    // Prevent editing superadmins unless caller is superadmin
    if (t.role === "superadmin" && user.role !== "superadmin") {
        return NextResponse.json({ error: "Forbidden: tidak bisa mengubah superadmin" }, { status: 403 });
    }

    // Prevent self-demotion for superadmins
    if (t.id === user.id && role && role !== "superadmin" && user.role === "superadmin") {
        return NextResponse.json({ error: "Forbidden: tidak bisa menurunkan diri sendiri" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (role && ["user", "admin", "superadmin"].includes(role)) {
        updates.role = role;
    }
    if (status && ["active", "suspended"].includes(status)) {
        updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    await db.update(users).set(updates).where(eq(users.id, params.id));

    // Determine audit action
    const auditAction = status === "suspended" ? "suspend_user" : role ? "role_change" : "role_change";

    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: user.id ?? null,
        action: auditAction,
        targetId: params.id,
        metadata: JSON.stringify({ ...updates, targetEmail: t.email }),
        createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
}
