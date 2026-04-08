import { getDb } from "@/lib/db";
import { users, pendingRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NimValidationResult } from "@/types";
import { AMISCA_CORE_PROGRAMS } from "@/types";

/**
 * NIM Format: [PPP][YY][SSS]
 *   PPP = Program code (digits 1–3)
 *   YY  = Enrollment year (digits 4–5)
 *   SSS = Sequence number (digits 6–8)
 *
 * Example: 10521028
 *   105 = Kimia ITB
 *   21  = Angkatan 2021
 *   028 = Nomor urut 028
 */

const NIM_REGEX = /^\d{8}$/;

/**
 * Validates a NIM against all 4 layers.
 *
 * @param nim - The 8-digit NIM string
 * @param submittedAngkatan - The angkatan year submitted in the form (4-digit year, e.g. 2021)
 * @param checkDuplicate - Whether to check DB for duplicates (default: true)
 */
export async function validateNim(
    nim: string,
    submittedAngkatan: number,
    checkDuplicate = true
): Promise<NimValidationResult> {
    const result: NimValidationResult = {
        formatValid: false,
        encodedYear: null,
        encodedProgram: null,
        scopeFlag: false,
        yearFlag: false,
        duplicateFlag: false,
    };

    // ─── Layer 1: Format (hard block) ─────────────────────────────
    if (!NIM_REGEX.test(nim)) {
        return result;
    }

    const programCode = nim.substring(0, 3); // PPP — digits 1–3
    const yearCode = parseInt(nim.substring(3, 5), 10); // YY — digits 4–5

    // Validate year range: 98–(current year − 2000 + 2)
    const currentYearShort = new Date().getFullYear() - 2000;
    const maxYear = currentYearShort + 2;

    // Handle wrap-around: years 98-99 are 1998-1999, years 00-maxYear are 2000+
    const isValidYear =
        (yearCode >= 0 && yearCode <= maxYear) ||
        (yearCode >= 98 && yearCode <= 99);

    if (!isValidYear) {
        return result;
    }

    result.formatValid = true;
    result.encodedProgram = programCode;
    result.encodedYear = yearCode;

    // ─── Layer 2: Program scope (soft flag) ───────────────────────
    const isCoreProgram = (AMISCA_CORE_PROGRAMS as readonly string[]).includes(
        programCode
    );

    if (!isCoreProgram) {
        result.scopeFlag = true;
    }

    // ─── Layer 3: Angkatan consistency (soft flag) ────────────────
    // Convert 4-digit year to 2-digit: 2021 → 21
    const submittedYearShort = submittedAngkatan % 100;
    const yearDifference = Math.abs(yearCode - submittedYearShort);

    if (yearDifference > 1) {
        result.yearFlag = true;
    }

    // ─── Layer 4: Uniqueness (hard block) ─────────────────────────
    if (checkDuplicate) {
        const db = getDb();

        const existingUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.nim, nim))
            .limit(1);

        if (existingUser.length > 0) {
            result.duplicateFlag = true;
            return result;
        }

        const existingPending = await db
            .select({ id: pendingRegistrations.id })
            .from(pendingRegistrations)
            .where(eq(pendingRegistrations.nim, nim))
            .limit(1);

        if (existingPending.length > 0) {
            result.duplicateFlag = true;
        }
    }

    return result;
}
