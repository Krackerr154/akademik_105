import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { kelompokCards, subjectKelompokMappings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** GET /api/kelompok — active dashboard category cards + subject mappings */
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

    const cardsRaw = await db
        .select()
        .from(kelompokCards)
        .where(eq(kelompokCards.isActive, 1))
        .orderBy(asc(kelompokCards.sortOrder), asc(kelompokCards.code));

    const mappings = await db
        .select()
        .from(subjectKelompokMappings)
        .orderBy(asc(subjectKelompokMappings.subjectLabel));

    const cards = cardsRaw.map((card) => ({
        ...card,
        isSystem: card.isSystem === 1,
        isActive: card.isActive === 1,
    }));

    return NextResponse.json({ cards, mappings });
}
