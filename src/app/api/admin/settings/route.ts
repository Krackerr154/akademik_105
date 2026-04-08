import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** GET /api/admin/settings */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const allSettings = await db.select().from(settings);
    const settingsMap = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));

    return NextResponse.json({ settings: settingsMap });
}

/** PUT /api/admin/settings */
export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "superadmin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const allowedKeys = ["gform_sheet_id", "gform_sheet_tab", "admin_whatsapp", "sync_interval_min"];
    const entries = Object.entries(body).filter(([key]) => allowedKeys.includes(key));

    if (entries.length === 0) {
        return NextResponse.json({ error: "Tidak ada pengaturan yang valid" }, { status: 400 });
    }

    const db = getDb();

    for (const [key, value] of entries) {
        const existing = await db
            .select()
            .from(settings)
            .where(eq(settings.key, key))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(settings)
                .set({ value: String(value) })
                .where(eq(settings.key, key));
        } else {
            await db.insert(settings).values({ key, value: String(value) });
        }
    }

    return NextResponse.json({ success: true });
}
