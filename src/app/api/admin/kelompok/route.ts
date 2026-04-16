import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { kelompokCards } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import {
    hasMinRole,
    KELOMPOK_CARD_STYLE,
    normalizeKelompokCode,
} from "@/types";

function ensureAdmin(user: { role?: string; status?: string }) {
    return user.status === "active" && hasMinRole(user.role ?? "", "admin");
}

function isValidInternalPhotoUrl(raw: string): boolean {
    if (!raw.startsWith("/api/kelompok/photo?")) {
        return false;
    }

    try {
        const parsed = new URL(raw, "https://internal.local");
        if (parsed.pathname !== "/api/kelompok/photo") {
            return false;
        }

        const driveId = (parsed.searchParams.get("driveId") ?? "").trim();
        const fileId = (parsed.searchParams.get("fileId") ?? "").trim();

        if (driveId !== "A" && driveId !== "B") {
            return false;
        }

        return fileId.length > 0;
    } catch {
        return false;
    }
}

function isValidPhotoUrl(raw: string): boolean {
    if (isValidInternalPhotoUrl(raw)) {
        return true;
    }

    try {
        const url = new URL(raw);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

/** GET /api/admin/kelompok */
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
    const cards = await db
        .select()
        .from(kelompokCards)
        .orderBy(desc(kelompokCards.isActive), asc(kelompokCards.sortOrder), asc(kelompokCards.code));

    return NextResponse.json({ cards });
}

/** POST /api/admin/kelompok */
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
    const normalizedCode = normalizeKelompokCode(String(body.code ?? body.name ?? ""));
    const name = String(body.name ?? "").trim();
    const description = body.description === undefined ? null : String(body.description).trim();
    const photoUrl = body.photoUrl === undefined ? null : String(body.photoUrl).trim();
    const styleRaw = String(body.cardStyle ?? KELOMPOK_CARD_STYLE.RECT);
    const cardStyle = styleRaw === KELOMPOK_CARD_STYLE.DRIVE
        ? KELOMPOK_CARD_STYLE.DRIVE
        : KELOMPOK_CARD_STYLE.RECT;

    if (!normalizedCode) {
        return NextResponse.json({ error: "Kode kelompok wajib diisi" }, { status: 400 });
    }

    if (!name) {
        return NextResponse.json({ error: "Nama kelompok wajib diisi" }, { status: 400 });
    }

    if (name.length > 80) {
        return NextResponse.json({ error: "Nama kelompok maksimal 80 karakter" }, { status: 400 });
    }

    if (description && description.length > 300) {
        return NextResponse.json({ error: "Deskripsi maksimal 300 karakter" }, { status: 400 });
    }

    if (photoUrl && !isValidPhotoUrl(photoUrl)) {
        return NextResponse.json({ error: "URL foto tidak valid" }, { status: 400 });
    }

    const db = getDb();
    const existing = await db
        .select({ id: kelompokCards.id })
        .from(kelompokCards)
        .where(eq(kelompokCards.code, normalizedCode))
        .limit(1);

    if (existing.length > 0) {
        return NextResponse.json({ error: "Kode kelompok sudah ada" }, { status: 409 });
    }

    const maxSort = await db
        .select({ sortOrder: kelompokCards.sortOrder })
        .from(kelompokCards)
        .orderBy(desc(kelompokCards.sortOrder))
        .limit(1);

    const now = Date.now();
    const newCard = {
        id: crypto.randomUUID(),
        code: normalizedCode,
        name,
        description: description || null,
        photoUrl: photoUrl || null,
        cardStyle,
        isSystem: 0,
        isActive: 1,
        sortOrder: maxSort.length > 0 ? (maxSort[0].sortOrder ?? 0) + 1 : 0,
        createdBy: user.id ?? null,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(kelompokCards).values(newCard);

    return NextResponse.json({ success: true, card: newCard });
}

/** PATCH /api/admin/kelompok */
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
        return NextResponse.json({ error: "ID kelompok wajib diisi" }, { status: 400 });
    }

    const db = getDb();
    const existing = await db
        .select()
        .from(kelompokCards)
        .where(eq(kelompokCards.id, id))
        .limit(1);

    if (existing.length === 0) {
        return NextResponse.json({ error: "Kelompok tidak ditemukan" }, { status: 404 });
    }

    const target = existing[0];

    const updates: Partial<typeof target> = {
        updatedAt: Date.now(),
    };

    if (body.name !== undefined) {
        const nextName = String(body.name).trim();
        if (!nextName) {
            return NextResponse.json({ error: "Nama kelompok wajib diisi" }, { status: 400 });
        }
        if (nextName.length > 80) {
            return NextResponse.json({ error: "Nama kelompok maksimal 80 karakter" }, { status: 400 });
        }
        updates.name = nextName;
    }

    if (body.description !== undefined) {
        const nextDescription = String(body.description ?? "").trim();
        if (nextDescription.length > 300) {
            return NextResponse.json({ error: "Deskripsi maksimal 300 karakter" }, { status: 400 });
        }
        updates.description = nextDescription || null;
    }

    if (body.photoUrl !== undefined) {
        const nextPhoto = String(body.photoUrl ?? "").trim();
        if (nextPhoto && !isValidPhotoUrl(nextPhoto)) {
            return NextResponse.json({ error: "URL foto tidak valid" }, { status: 400 });
        }
        updates.photoUrl = nextPhoto || null;
    }

    if (body.cardStyle !== undefined) {
        const nextStyle = String(body.cardStyle);
        if (
            nextStyle !== KELOMPOK_CARD_STYLE.RECT &&
            nextStyle !== KELOMPOK_CARD_STYLE.DRIVE
        ) {
            return NextResponse.json({ error: "cardStyle tidak valid" }, { status: 400 });
        }
        updates.cardStyle = nextStyle;
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
                { error: "Kelompok sistem tidak dapat diarsipkan" },
                { status: 400 }
            );
        }
        updates.isActive = nextActive ? 1 : 0;
    }

    await db
        .update(kelompokCards)
        .set(updates)
        .where(and(eq(kelompokCards.id, id), eq(kelompokCards.code, target.code)));

    return NextResponse.json({ success: true });
}
