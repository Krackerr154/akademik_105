import { normalizeSubjectKey } from "@/types";

const FALLBACK_SUBJECT_RULES: Array<{ code: string; patterns: string[] }> = [
    { code: "KIMIA_UMUM", patterns: ["KIMIA UMUM", "KIX1X1"] },
    { code: "KIMIA_ANALITIK", patterns: ["KIMIA ANALITIK", "KIXX2X"] },
    { code: "KIMIA_ANORGANIK", patterns: ["KIMIA ANORGANIK", "KIXX3X"] },
    { code: "KIMIA_FISIK", patterns: ["KIMIA FISIK", "KIXX4X"] },
    { code: "KIMIA_ORGANIK", patterns: ["KIMIA ORGANIK", "KIXX5X"] },
    { code: "BIOKIMIA", patterns: ["BIOKIMIA", "KIXX6X"] },
    { code: "MATA_KULIAH_NON_KI", patterns: ["NON KI", "NON-KI"] },
    { code: "SOFTWARE", patterns: ["SOFTWARE", "KOMPUTASI", "PROGRAMMING"] },
];

export function inferKelompokCodeFromSubject(subject: string): string | null {
    const normalized = normalizeSubjectKey(subject);
    if (!normalized) return null;

    for (const rule of FALLBACK_SUBJECT_RULES) {
        if (rule.patterns.some((pattern) => normalized.includes(pattern))) {
            return rule.code;
        }
    }

    return null;
}

export function resolveKelompokCodeForSubject(
    subject: string,
    subjectMapping: Map<string, string>
): string | null {
    const key = normalizeSubjectKey(subject);
    if (!key) return null;

    return subjectMapping.get(key) ?? inferKelompokCodeFromSubject(subject);
}
