import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, subjectKelompokMappings } from "@/db/schema";
import { and, asc, desc, eq, or, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
    getFallbackSubjectPatternsForKelompok,
    resolveKelompokCodeForSubject,
} from "@/lib/kelompok";
import {
    normalizeDocumentTypeCode,
    normalizeKelompokCode,
    normalizeSubjectKey,
} from "@/types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 200;
const PRIVATE_CACHE_CONTROL = "private, max-age=120, stale-while-revalidate=300";

type SortMode = "newest" | "oldest" | "title" | "size";

function resolveSortMode(rawSort: string | null): SortMode {
    switch ((rawSort ?? "").trim().toLowerCase()) {
        case "oldest":
            return "oldest";
        case "title":
            return "title";
        case "size":
            return "size";
        default:
            return "newest";
    }
}

function buildSubjectEqualsCondition(subjectKey: string): SQL {
    return sql`upper(trim(${files.subject})) = ${subjectKey}`;
}

function buildSearchCondition(rawQuery: string): SQL | null {
    const normalizedQuery = rawQuery.trim().toUpperCase();
    if (!normalizedQuery) return null;

    const pattern = `%${normalizedQuery}%`;
    return or(
        sql`upper(${files.title}) like ${pattern}`,
        sql`upper(${files.subject}) like ${pattern}`,
        sql`upper(coalesce(${files.docType}, '')) like ${pattern}`,
        sql`upper(coalesce(${files.tags}, '')) like ${pattern}`,
        sql`upper(coalesce(${files.abstract}, '')) like ${pattern}`,
        sql`upper(coalesce(${files.authors}, '')) like ${pattern}`
    ) ?? null;
}

function buildCacheHeaders(): Headers {
    const headers = new Headers();
    headers.set("Cache-Control", PRIVATE_CACHE_CONTROL);
    headers.set("Vary", "Cookie");
    return headers;
}

/** GET /api/files — List all files (members) */
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { status?: string; role?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const url = new URL(req.url);

    const requestedCategory = normalizeKelompokCode(
        String(url.searchParams.get("category") ?? "")
    );
    const requestedSubjectKey = normalizeSubjectKey(
        String(url.searchParams.get("subject") ?? "")
    );
    const requestedQuery = String(url.searchParams.get("q") ?? "").trim();
    const requestedDocTypeRaw = String(url.searchParams.get("docType") ?? "").trim();
    const requestedDocType = requestedDocTypeRaw
        ? normalizeDocumentTypeCode(requestedDocTypeRaw)
        : "";
    const requestedMimeType = String(url.searchParams.get("mimeType") ?? "").trim();
    const sortMode = resolveSortMode(url.searchParams.get("sort"));

    const hasPagination =
        url.searchParams.has("page") || url.searchParams.has("pageSize");
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const requestedPageSize = Number(
        url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE)
    );

    const page = Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;
    const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(MAX_PAGE_SIZE, Math.floor(requestedPageSize))
        : DEFAULT_PAGE_SIZE;

    const mappings = await db
        .select({
            subjectKey: subjectKelompokMappings.subjectKey,
            kelompokCode: subjectKelompokMappings.kelompokCode,
        })
        .from(subjectKelompokMappings);

    const mappingBySubject = new Map<string, string>();
    for (const row of mappings) {
        mappingBySubject.set(row.subjectKey, row.kelompokCode);
    }

    const whereParts: SQL[] = [];

    if (!isAdmin) {
        whereParts.push(eq(files.visibility, "members"));
    }

    if (requestedSubjectKey) {
        whereParts.push(buildSubjectEqualsCondition(requestedSubjectKey));
    }

    if (requestedDocType) {
        whereParts.push(eq(files.docType, requestedDocType));
    }

    if (requestedMimeType) {
        whereParts.push(eq(files.mimeType, requestedMimeType));
    }

    const searchCondition = buildSearchCondition(requestedQuery);
    if (searchCondition) {
        whereParts.push(searchCondition);
    }

    if (requestedCategory) {
        const mappedSubjectKeys = new Set<string>();
        for (const row of mappings) {
            if (row.kelompokCode === requestedCategory) {
                mappedSubjectKeys.add(row.subjectKey);
            }
        }

        const fallbackPatterns = new Set<string>(
            getFallbackSubjectPatternsForKelompok(requestedCategory)
        );

        const categoryPredicates: SQL[] = [];
        mappedSubjectKeys.forEach((subjectKey) => {
            categoryPredicates.push(buildSubjectEqualsCondition(subjectKey));
        });

        fallbackPatterns.forEach((pattern) => {
            categoryPredicates.push(
                sql`upper(${files.subject}) like ${`%${pattern.toUpperCase()}%`}`
            );
        });

        if (categoryPredicates.length === 0) {
            return NextResponse.json(
                {
                    files: [],
                    meta: {
                        total: 0,
                        page: hasPagination ? page : 1,
                        pageSize: hasPagination ? pageSize : 0,
                        totalPages: 1,
                        category: requestedCategory,
                        query: requestedQuery || null,
                    },
                },
                {
                    headers: buildCacheHeaders(),
                }
            );
        }

        const categoryCondition = or(...categoryPredicates);
        if (categoryCondition) {
            whereParts.push(categoryCondition);
        }
    }

    const whereClause = whereParts.length > 0 ? and(...whereParts) : undefined;

    const countQuery = db
        .select({ total: sql<number>`count(*)` })
        .from(files);
    const totalResult = whereClause
        ? await countQuery.where(whereClause)
        : await countQuery;
    const total = Number(totalResult[0]?.total ?? 0);

    const totalPages = hasPagination ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const safePage = hasPagination ? Math.min(page, totalPages) : 1;

    const orderByColumns = (() => {
        switch (sortMode) {
            case "oldest":
                return [asc(files.createdAt), asc(files.id)];
            case "title":
                return [asc(files.title), desc(files.createdAt)];
            case "size":
                return [desc(files.sizeBytes), desc(files.createdAt)];
            default:
                return [desc(files.createdAt), desc(files.id)];
        }
    })();

    const baseQuery = whereClause
        ? db.select().from(files).where(whereClause).orderBy(...orderByColumns)
        : db.select().from(files).orderBy(...orderByColumns);

    const selectedRows = hasPagination
        ? await baseQuery
            .limit(pageSize)
            .offset((safePage - 1) * pageSize)
        : await baseQuery;

    const enriched = selectedRows.map((f) => ({
        ...f,
        kelompokCode: resolveKelompokCodeForSubject(f.subject, mappingBySubject),
    }));

    // Strip gdrive_file_id for non-admin
    const sanitized = enriched.map((f) => {
        if (isAdmin) return f;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { gdriveFileId, ...rest } = f;
        return rest;
    });

    return NextResponse.json(
        {
            files: sanitized,
            meta: {
                total,
                page: hasPagination ? safePage : 1,
                pageSize: hasPagination ? pageSize : total,
                totalPages,
                category: requestedCategory || null,
                query: requestedQuery || null,
            },
        },
        {
            headers: buildCacheHeaders(),
        }
    );
}
