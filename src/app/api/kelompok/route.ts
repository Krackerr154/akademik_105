import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, kelompokCards, subjectKelompokMappings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizeSubjectKey } from "@/types";

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

    const [cardsRaw, mappings, subjectsRaw] = await Promise.all([
        db
            .select()
            .from(kelompokCards)
            .where(eq(kelompokCards.isActive, 1))
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

    const countBySubjectKey = new Map<string, number>();
    for (const row of subjectsRaw) {
        const key = normalizeSubjectKey(String(row.subject ?? ""));
        if (!key) continue;
        countBySubjectKey.set(key, (countBySubjectKey.get(key) ?? 0) + 1);
    }

    const cards = cardsRaw.map((card) => ({
        ...card,
        isSystem: card.isSystem === 1,
        isActive: card.isActive === 1,
    }));

    const subjectCards = mappings.map((row) => ({
        subjectKey: row.subjectKey,
        subjectLabel: row.subjectLabel,
        kelompokCode: row.kelompokCode,
        fileCount: countBySubjectKey.get(row.subjectKey) ?? 0,
    }));

    return NextResponse.json({ cards, mappings, subjectCards });
}
