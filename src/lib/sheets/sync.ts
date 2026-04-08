import { google } from "googleapis";
import { getDb } from "@/lib/db";
import {
    pendingRegistrations,
    users,
    auditLog,
    settings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateNim } from "@/lib/nim-validator";

interface SyncResult {
    added: number;
    skipped: number;
    errors: string[];
}

/**
 * Sync Google Form responses from Google Sheets.
 * Per rules.md §5.2:
 * - Read all rows from configured Sheet tab
 * - Deduplicate by email
 * - Run validateNim() on each new row
 * - Insert into pending_registrations with all flags
 * - Idempotent — safe to call multiple times
 * - Never modify or delete Sheet rows — read-only
 */
export async function syncGFormResponses(
    adminUserId: string
): Promise<SyncResult> {
    const db = getDb();
    const result: SyncResult = { added: 0, skipped: 0, errors: [] };

    // ─── Get config from settings ─────────────────────────────────
    const settingsRows = await db.select().from(settings);
    const settingsMap = new Map(settingsRows.map((s) => [s.key, s.value]));

    const sheetId = settingsMap.get("gform_sheet_id");
    const sheetTab = settingsMap.get("gform_sheet_tab") ?? "Form Responses 1";

    if (!sheetId) {
        result.errors.push("Google Sheet ID belum dikonfigurasi di settings.");
        return result;
    }

    // ─── Auth with service account ────────────────────────────────
    const clientEmail = process.env.GSHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GSHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!clientEmail || !privateKey) {
        result.errors.push("Kredensial Google Sheets belum dikonfigurasi.");
        return result;
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ─── Read rows ────────────────────────────────────────────────
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetTab}!A:H`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
        result.errors.push("Tidak ada data baru di Google Sheet.");
        return result;
    }

    // Skip header row
    const dataRows = rows.slice(1);

    for (const row of dataRows) {
        try {
            // Expected columns: Timestamp, Nama, Email, NIM, Angkatan, WhatsApp, Program Studi, Pernyataan
            const [timestamp, fullName, email, nim, angkatanStr, whatsapp, program] =
                row;

            if (!email || !fullName || !nim) {
                result.skipped++;
                continue;
            }

            const emailLower = email.trim().toLowerCase();
            const angkatan = parseInt(angkatanStr, 10);

            // ─── Deduplication ──────────────────────────────────────
            // Skip if email already in pending_registrations
            const existingPending = await db
                .select({ id: pendingRegistrations.id })
                .from(pendingRegistrations)
                .where(eq(pendingRegistrations.email, emailLower))
                .limit(1);

            if (existingPending.length > 0) {
                result.skipped++;
                continue;
            }

            // Skip if email already in users
            const existingUser = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.email, emailLower))
                .limit(1);

            if (existingUser.length > 0) {
                result.skipped++;
                continue;
            }

            // ─── NIM Validation ─────────────────────────────────────
            const nimTrimmed = nim.trim();
            const validation = await validateNim(nimTrimmed, angkatan);

            // Parse program to standard key
            const programKey = normalizeProgram(program?.trim() ?? "");

            // Parse GForm timestamp
            const submittedAt = timestamp
                ? new Date(timestamp).getTime()
                : Date.now();

            // ─── Insert ─────────────────────────────────────────────
            await db.insert(pendingRegistrations).values({
                id: crypto.randomUUID(),
                email: emailLower,
                fullName: fullName.trim(),
                nim: nimTrimmed,
                angkatan: isNaN(angkatan) ? 0 : angkatan,
                whatsapp: whatsapp?.trim() ?? "",
                program: programKey,
                submittedAt,
                syncedAt: Date.now(),
                approvalStatus: "pending",
                nimFormatValid: validation.formatValid ? 1 : 0,
                nimScopeFlag: validation.scopeFlag ? 1 : 0,
                nimYearFlag: validation.yearFlag ? 1 : 0,
                nimDuplicate: validation.duplicateFlag ? 1 : 0,
            });

            result.added++;
        } catch (err) {
            result.errors.push(
                `Error pada baris ${row[2] ?? "unknown"}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    // ─── Log to audit ─────────────────────────────────────────────
    await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        userId: adminUserId,
        action: "sync_gform",
        metadata: JSON.stringify({
            added: result.added,
            skipped: result.skipped,
            errors: result.errors.length,
        }),
        createdAt: Date.now(),
    });

    return result;
}

function normalizeProgram(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("kimia") && !lower.includes("teknik")) return "kimia";
    if (lower.includes("teknik kimia")) return "teknik_kimia";
    if (lower.includes("farmasi")) return "farmasi";
    return "other";
}
