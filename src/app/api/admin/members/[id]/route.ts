import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pendingRegistrations, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** PATCH /api/admin/members/[id] — Approve or reject */
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
    const { action, rejectionReason } = body as {
        action: "approve" | "reject";
        rejectionReason?: string;
    };

    if (action !== "approve" && action !== "reject") {
        return NextResponse.json({ error: "action harus 'approve' atau 'reject'" }, { status: 400 });
    }

    const db = getDb();
    const record = await db
        .select()
        .from(pendingRegistrations)
        .where(eq(pendingRegistrations.id, params.id))
        .limit(1);

    if (record.length === 0) {
        return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });
    }

    const r = record[0];

    // Hard block: can't approve if NIM format invalid
    if (action === "approve" && r.nimFormatValid === 0) {
        return NextResponse.json(
            { error: "Tidak bisa menyetujui: format NIM tidak valid" },
            { status: 400 }
        );
    }

    // Hard block: can't approve if NIM duplicate
    if (action === "approve" && r.nimDuplicate === 1) {
        return NextResponse.json(
            { error: "Tidak bisa menyetujui: NIM duplikat" },
            { status: 400 }
        );
    }

    const now = Date.now();
    await db
        .update(pendingRegistrations)
        .set({
            approvalStatus: action === "approve" ? "approved" : "rejected",
            reviewedBy: user.id ?? null,
            reviewedAt: now,
            rejectionReason: action === "reject" ? rejectionReason ?? null : null,
        })
        .where(eq(pendingRegistrations.id, params.id));

    // Audit log
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: user.id ?? null,
        action: action === "approve" ? "approve_member" : "reject_member",
        targetId: params.id,
        metadata: JSON.stringify({ email: r.email, nim: r.nim }),
        createdAt: now,
    });

    return NextResponse.json({ success: true });
}
