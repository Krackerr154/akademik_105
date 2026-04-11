import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { settings } from "@/db/schema";

/** Public settings keys that can be read without auth */
const PUBLIC_SETTINGS_KEYS = ["admin_whatsapp", "gform_url"] as const;

/** GET /api/settings — Public settings (non-admin) */
export async function GET() {
    const db = getDb();
    const allSettings = await db.select().from(settings);

    const publicSettings: Record<string, string> = {};
    for (const s of allSettings) {
        if ((PUBLIC_SETTINGS_KEYS as readonly string[]).includes(s.key)) {
            publicSettings[s.key] = s.value;
        }
    }

    return NextResponse.json({ settings: publicSettings });
}
