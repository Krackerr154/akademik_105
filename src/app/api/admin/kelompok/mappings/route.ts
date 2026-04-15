import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, kelompokCards, subjectKelompokMappings } from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole, normalizeKelompokCode, normalizeSubjectKey } from "@/types";

function ensureAdmin(user: { role?: string; status?: string }) {
    return user.status === "active" && hasMinRole(user.role ?? "", "admin");
}

/** GET /api/admin/kelompok/mappings */
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

    const [cards, mappings, subjectsRaw] = await Promise.all([
        db
            .select({ code: kelompokCards.code, name: kelompokCards.name, isActive: kelompokCards.isActive })
            .from(kelompokCards)
            .orderBy(asc(kelompokCards.sortOrder), asc(kelompokCards.code)),
        db
            .select()
            .from(subjectKelompokMappings)
            .orderBy(asc(subjectKelompokMappings.subjectLabel)),
        db
            .select({ subject: files.subject })
            .from(files)
            .orderBy(asc(files.subject)),
    ]);

    const mappedKeys = new Set(mappings.map((m) => m.subjectKey));
    const seen = new Set<string>();
    const countBySubjectKey = new Map<string, number>();
    const unmappedSubjects: Array<{ subjectKey: string; subjectLabel: string }> = [];

    for (const row of subjectsRaw) {
        const label = String(row.subject ?? "").trim();
        const key = normalizeSubjectKey(label);
        if (!key) continue;

        countBySubjectKey.set(key, (countBySubjectKey.get(key) ?? 0) + 1);

        if (seen.has(key)) continue;

        seen.add(key);
        if (!mappedKeys.has(key)) {
            unmappedSubjects.push({ subjectKey: key, subjectLabel: label });
        }
    }

    const mappingsWithStats = mappings.map((row) => ({
        ...row,
        fileCount: countBySubjectKey.get(row.subjectKey) ?? 0,
    }));

    return NextResponse.json({ cards, mappings: mappingsWithStats, unmappedSubjects });
}

/** POST /api/admin/kelompok/mappings */
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
    const subjectLabel = String(body.subjectLabel ?? body.subjectKey ?? "").trim();
    const subjectKey = normalizeSubjectKey(String(body.subjectKey ?? subjectLabel));
    const kelompokCode = normalizeKelompokCode(String(body.kelompokCode ?? ""));

    if (!subjectLabel) {
        return NextResponse.json({ error: "Nama mata kuliah wajib diisi" }, { status: 400 });
    }

    if (subjectLabel.length > 120) {
        return NextResponse.json({ error: "Nama mata kuliah maksimal 120 karakter" }, { status: 400 });
    }

    if (!subjectKey) {
        return NextResponse.json({ error: "subjectKey tidak valid" }, { status: 400 });
    }

    if (!kelompokCode) {
        return NextResponse.json({ error: "Kode kelompok wajib diisi" }, { status: 400 });
    }

    const db = getDb();

    const targetCard = await db
        .select({ code: kelompokCards.code })
        .from(kelompokCards)
        .where(eq(kelompokCards.code, kelompokCode))
        .limit(1);

    if (targetCard.length === 0) {
        return NextResponse.json({ error: "Kelompok tidak ditemukan" }, { status: 404 });
    }

    const existing = await db
        .select({ id: subjectKelompokMappings.id })
        .from(subjectKelompokMappings)
        .where(eq(subjectKelompokMappings.subjectKey, subjectKey))
        .limit(1);

    if (existing.length > 0) {
        return NextResponse.json({ error: "Mapping mata kuliah sudah ada" }, { status: 409 });
    }

    const now = Date.now();
    const newMapping = {
        id: crypto.randomUUID(),
        subjectKey,
        subjectLabel,
        kelompokCode,
        createdBy: user.id ?? null,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(subjectKelompokMappings).values(newMapping);

    return NextResponse.json({ success: true, mapping: newMapping });
}

/** PATCH /api/admin/kelompok/mappings */
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
        return NextResponse.json({ error: "ID mapping wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const existing = await db
        .select()
        .from(subjectKelompokMappings)
        .where(eq(subjectKelompokMappings.id, id))
        .limit(1);

    if (existing.length === 0) {
        return NextResponse.json({ error: "Mapping tidak ditemukan" }, { status: 404 });
    }

    const target = existing[0];
    const updates: Partial<typeof target> = {
        updatedAt: Date.now(),
    };

    if (body.subjectLabel !== undefined || body.subjectKey !== undefined) {
        const nextSubjectLabel = String(body.subjectLabel ?? target.subjectLabel).trim();
        const nextSubjectKey = normalizeSubjectKey(String(body.subjectKey ?? nextSubjectLabel));

        if (!nextSubjectLabel) {
            return NextResponse.json({ error: "Nama mata kuliah wajib diisi" }, { status: 400 });
        }

        if (nextSubjectLabel.length > 120) {
            return NextResponse.json({ error: "Nama mata kuliah maksimal 120 karakter" }, { status: 400 });
        }

        if (!nextSubjectKey) {
            return NextResponse.json({ error: "subjectKey tidak valid" }, { status: 400 });
        }

        const duplicate = await db
            .select({ id: subjectKelompokMappings.id })
            .from(subjectKelompokMappings)
            .where(
                and(
                    eq(subjectKelompokMappings.subjectKey, nextSubjectKey),
                    ne(subjectKelompokMappings.id, id)
                )
            )
            .limit(1);

        if (duplicate.length > 0) {
            return NextResponse.json(
                { error: "subjectKey sudah digunakan mapping lain" },
                { status: 409 }
            );
        }

        updates.subjectLabel = nextSubjectLabel;
        updates.subjectKey = nextSubjectKey;
    }

    if (body.kelompokCode !== undefined) {
        const nextCode = normalizeKelompokCode(String(body.kelompokCode));
        if (!nextCode) {
            return NextResponse.json({ error: "kelompokCode tidak valid" }, { status: 400 });
        }

        const targetCard = await db
            .select({ code: kelompokCards.code })
            .from(kelompokCards)
            .where(eq(kelompokCards.code, nextCode))
            .limit(1);

        if (targetCard.length === 0) {
            return NextResponse.json({ error: "Kelompok tidak ditemukan" }, { status: 404 });
        }

        updates.kelompokCode = nextCode;
    }

    await db
        .update(subjectKelompokMappings)
        .set(updates)
        .where(eq(subjectKelompokMappings.id, id));

    return NextResponse.json({ success: true });
}

/** DELETE /api/admin/kelompok/mappings */
export async function DELETE(req: NextRequest) {
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
        return NextResponse.json({ error: "ID mapping wajib diisi" }, { status: 400 });
    }

    const db = getDb();

    const existing = await db
        .select({ id: subjectKelompokMappings.id })
        .from(subjectKelompokMappings)
        .where(eq(subjectKelompokMappings.id, id))
        .limit(1);

    if (existing.length === 0) {
        return NextResponse.json({ error: "Mapping tidak ditemukan" }, { status: 404 });
    }

    await db
        .delete(subjectKelompokMappings)
        .where(eq(subjectKelompokMappings.id, id));

    return NextResponse.json({ success: true });
}
