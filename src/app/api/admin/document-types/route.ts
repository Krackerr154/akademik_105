import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { documentTypes } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole, normalizeDocumentTypeCode, formatDocumentTypeLabel } from "@/types";

function ensureAdmin(user: { role?: string; status?: string }) {
    return user.status === "active" && hasMinRole(user.role ?? "", "admin");
}

/** GET /api/admin/document-types */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; status?: string };
    if (!ensureAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const types = await db
        .select()
        .from(documentTypes)
        .orderBy(desc(documentTypes.isActive), asc(documentTypes.sortOrder), asc(documentTypes.code));

    return NextResponse.json({ types });
}

/** POST /api/admin/document-types */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id?: string; role?: string; status?: string };
    if (!ensureAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const rawCode = String(body.code ?? body.label ?? "");
    const normalizedCode = normalizeDocumentTypeCode(rawCode);

    if (!normalizedCode) {
        return NextResponse.json({ error: "Kode tipe dokumen wajib diisi" }, { status: 400 });
    }

    if (normalizedCode.length > 40) {
        return NextResponse.json(
            { error: "Kode tipe dokumen terlalu panjang (maksimum 40 karakter)" },
            { status: 400 }
        );
    }

    const db = getDb();
    const existing = await db
        .select({ id: documentTypes.id })
        .from(documentTypes)
        .where(eq(documentTypes.code, normalizedCode))
        .limit(1);

    if (existing.length > 0) {
        return NextResponse.json({ error: "Tipe dokumen sudah ada" }, { status: 409 });
    }

    const maxSort = await db
        .select({ sortOrder: documentTypes.sortOrder })
        .from(documentTypes)
        .orderBy(desc(documentTypes.sortOrder))
        .limit(1);

    const now = Date.now();
    const newType = {
        id: crypto.randomUUID(),
        code: normalizedCode,
        label: String(body.label ?? formatDocumentTypeLabel(normalizedCode)),
        isSystem: 0,
        isActive: 1,
        sortOrder: maxSort.length > 0 ? (maxSort[0].sortOrder ?? 0) + 1 : 0,
        createdBy: user.id ?? null,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(documentTypes).values(newType);

    return NextResponse.json({ success: true, type: newType });
}

/** PATCH /api/admin/document-types */
export async function PATCH(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; status?: string };
    if (!ensureAdmin(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
        return NextResponse.json({ error: "ID tipe dokumen wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const existing = await db
        .select()
        .from(documentTypes)
        .where(eq(documentTypes.id, id))
        .limit(1);

    if (existing.length === 0) {
        return NextResponse.json({ error: "Tipe dokumen tidak ditemukan" }, { status: 404 });
    }

    const target = existing[0];

    const updates: Partial<typeof target> = {
        updatedAt: Date.now(),
    };

    if (body.label !== undefined) {
        const label = String(body.label).trim();
        if (!label) {
            return NextResponse.json({ error: "Label tidak boleh kosong" }, { status: 400 });
        }
        updates.label = label;
    }

    if (body.sortOrder !== undefined) {
        const parsed = Number(body.sortOrder);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return NextResponse.json({ error: "sortOrder tidak valid" }, { status: 400 });
        }
        updates.sortOrder = Math.floor(parsed);
    }

    if (body.isActive !== undefined) {
        const nextActive = Boolean(body.isActive);

        if (target.isSystem === 1 && !nextActive) {
            return NextResponse.json(
                { error: "Tipe sistem bawaan tidak dapat diarsipkan" },
                { status: 400 }
            );
        }

        updates.isActive = nextActive ? 1 : 0;
    }

    await db
        .update(documentTypes)
        .set(updates)
        .where(and(eq(documentTypes.id, id), eq(documentTypes.code, target.code)));

    return NextResponse.json({ success: true });
}
