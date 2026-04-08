import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { pendingRegistrations, auditLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** POST /api/admin/members/bulk-approve — Bulk approve by angkatan */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { angkatan } = body as { angkatan: number };

    if (!angkatan) {
        return NextResponse.json({ error: "angkatan wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const now = Date.now();

    // Get eligible records: pending + NIM valid + no duplicate + no soft flags
    const eligible = await db
        .select()
        .from(pendingRegistrations)
        .where(
            and(
                eq(pendingRegistrations.angkatan, angkatan),
                eq(pendingRegistrations.approvalStatus, "pending"),
                eq(pendingRegistrations.nimFormatValid, 1),
                eq(pendingRegistrations.nimDuplicate, 0),
                eq(pendingRegistrations.nimScopeFlag, 0),
                eq(pendingRegistrations.nimYearFlag, 0)
            )
        );

    let approvedCount = 0;

    for (const record of eligible) {
        await db
            .update(pendingRegistrations)
            .set({
                approvalStatus: "approved",
                reviewedBy: user.id ?? null,
                reviewedAt: now,
            })
            .where(eq(pendingRegistrations.id, record.id));
        approvedCount++;
    }

    // Audit log
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: user.id ?? null,
        action: "bulk_approve",
        metadata: JSON.stringify({ angkatan, approvedCount }),
        createdAt: now,
    });

    return NextResponse.json({ approvedCount });
}
