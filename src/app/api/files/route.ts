import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, subjectKelompokMappings } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { resolveKelompokCodeForSubject } from "@/lib/kelompok";
import { normalizeKelompokCode } from "@/types";

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
    const hasPagination =
        url.searchParams.has("page") || url.searchParams.has("pageSize");
    const requestedPage = Number(url.searchParams.get("page") ?? "1");
    const requestedPageSize = Number(url.searchParams.get("pageSize") ?? "50");

    const page = Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;
    const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(200, Math.floor(requestedPageSize))
        : 50;

    const [allFiles, mappings] = await Promise.all([
        db
            .select()
            .from(files)
            .orderBy(desc(files.createdAt)),
        db
            .select({
                subjectKey: subjectKelompokMappings.subjectKey,
                kelompokCode: subjectKelompokMappings.kelompokCode,
            })
            .from(subjectKelompokMappings),
    ]);

    const mappingBySubject = new Map<string, string>();
    for (const row of mappings) {
        mappingBySubject.set(row.subjectKey, row.kelompokCode);
    }

    const enriched = allFiles.map((f) => ({
        ...f,
        kelompokCode: resolveKelompokCodeForSubject(f.subject, mappingBySubject),
    }));

    const byCategory = requestedCategory
        ? enriched.filter((f) => f.kelompokCode === requestedCategory)
        : enriched;

    const total = byCategory.length;
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const safePage = Math.min(page, totalPages);
    const paged = hasPagination
        ? byCategory.slice((safePage - 1) * pageSize, safePage * pageSize)
        : byCategory;

    // Strip gdrive_file_id for non-admin
    const sanitized = paged.map((f) => {
        if (isAdmin) return f;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { gdriveFileId, ...rest } = f;
        return rest;
    });

    return NextResponse.json({
        files: sanitized,
        meta: {
            total,
            page: hasPagination ? safePage : 1,
            pageSize: hasPagination ? pageSize : total,
            totalPages: hasPagination ? totalPages : 1,
            category: requestedCategory || null,
        },
    });
}
