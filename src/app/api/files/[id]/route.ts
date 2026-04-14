import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { files, auditLog, documentTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDriveAdapter } from "@/lib/drive/adapter";
import { normalizeDocumentTypeCode } from "@/types";

/** GET /api/files/[id] — File metadata */
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const file = await db
        .select()
        .from(files)
        .where(eq(files.id, params.id))
        .limit(1);

    if (file.length === 0) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const f = file[0];
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    // Enforce visibility
    if (f.visibility === "admin_only" && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Strip gdrive_file_id for non-admin
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { gdriveFileId, ...sanitized } = f;
    return NextResponse.json({
        file: isAdmin ? f : sanitized,
    });
}

/** PATCH /api/files/[id] — Edit metadata (owner or admin) */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const file = await db
        .select()
        .from(files)
        .where(eq(files.id, params.id))
        .limit(1);

    if (file.length === 0) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const f = file[0];
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isOwner = f.uploaderId === user.id;

    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, subject, docType, tags, abstract, year, authors, angkatanTags, visibility } =
        body as Partial<typeof f>;

    let nextDocType: string | undefined;
    if (docType !== undefined) {
        const normalizedDocType = normalizeDocumentTypeCode(String(docType));
        if (!normalizedDocType) {
            return NextResponse.json(
                { error: "Tipe dokumen tidak valid" },
                { status: 400 }
            );
        }

        const matchingType = await db
            .select({
                code: documentTypes.code,
                isActive: documentTypes.isActive,
            })
            .from(documentTypes)
            .where(eq(documentTypes.code, normalizedDocType))
            .limit(1);

        if (matchingType.length === 0) {
            return NextResponse.json(
                { error: "Tipe dokumen tidak terdaftar" },
                { status: 400 }
            );
        }

        if (matchingType[0].isActive !== 1 && normalizedDocType !== f.docType) {
            return NextResponse.json(
                { error: "Tipe dokumen sudah diarsipkan dan tidak dapat dipakai" },
                { status: 400 }
            );
        }

        nextDocType = normalizedDocType;
    }

    await db
        .update(files)
        .set({
            ...(title && { title }),
            ...(subject && { subject }),
            ...(nextDocType !== undefined && { docType: nextDocType }),
            ...(tags !== undefined && { tags }),
            ...(abstract !== undefined && { abstract }),
            ...(year !== undefined && { year }),
            ...(authors !== undefined && { authors }),
            ...(angkatanTags !== undefined && { angkatanTags }),
            ...(visibility && isAdmin && { visibility }),
            updatedAt: Date.now(),
        })
        .where(eq(files.id, params.id));

    // Audit log
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: user.id ?? null,
        action: "edit_metadata",
        targetId: params.id,
        createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
}

/** DELETE /api/files/[id] — Delete file (owner or admin) */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const file = await db
        .select()
        .from(files)
        .where(eq(files.id, params.id))
        .limit(1);

    if (file.length === 0) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    const f = file[0];
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isOwner = f.uploaderId === user.id;

    if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Per rules.md §6.2: Delete from Drive first, then DB
    // If Drive delete fails, do NOT delete from DB
    const adapter = getDriveAdapter();
    const deleted = await adapter.deleteFile(
        f.driveId as "A" | "B",
        f.gdriveFileId
    );

    if (!deleted) {
        return NextResponse.json(
            { error: "Gagal menghapus file dari Drive. Hubungi admin." },
            { status: 500 }
        );
    }

    // Now safe to delete from DB
    await db.delete(files).where(eq(files.id, params.id));

    // Audit log
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: user.id ?? null,
        action: "delete",
        targetId: params.id,
        metadata: JSON.stringify({ title: f.title, driveId: f.driveId }),
        createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
}
