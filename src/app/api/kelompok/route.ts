import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, kelompokCards, subjectKelompokMappings } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { normalizeSubjectKey } from "@/types";

const PRIVATE_CACHE_CONTROL = "private, max-age=300, stale-while-revalidate=600";

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
    const normalizedSubjectExpr = sql<string>`upper(trim(${files.subject}))`;

    const [cardsRaw, mappings, subjectCountsRaw] = await Promise.all([
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
            .select({
                subjectKey: normalizedSubjectExpr,
                fileCount: sql<number>`count(*)`,
            })
            .from(files)
            .groupBy(normalizedSubjectExpr),
    ]);

    const countBySubjectKey = new Map<string, number>();
    for (const row of subjectCountsRaw) {
        const key = normalizeSubjectKey(String(row.subjectKey ?? ""));
        if (!key) continue;
        countBySubjectKey.set(key, Number(row.fileCount ?? 0));
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

    const headers = new Headers();
    headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    headers.set("Vary", "Cookie");

    return NextResponse.json(
        { cards, mappings, subjectCards },
        { headers }
    );
}
