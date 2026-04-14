// ─── Role & Status Constants ───────────────────────────────────────────

export const ROLES = {
    SUPERADMIN: "superadmin",
    ADMIN: "admin",
    USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_WEIGHT: Record<Role, number> = {
    superadmin: 3,
    admin: 2,
    user: 1,
} as const;

export const USER_STATUS = {
    ACTIVE: "active",
    SUSPENDED: "suspended",
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const APPROVAL_STATUS = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
} as const;

export type ApprovalStatus =
    (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

// ─── Helpers ───────────────────────────────────────────────────────────

export function hasMinRole(userRole: string, minRole: Role): boolean {
    return (
        (ROLE_WEIGHT[userRole as Role] ?? 0) >= ROLE_WEIGHT[minRole]
    );
}

// ─── NIM Validation Types ──────────────────────────────────────────────

export interface NimValidationResult {
    formatValid: boolean;
    encodedYear: number | null;
    encodedProgram: string | null;
    scopeFlag: boolean;
    yearFlag: boolean;
    duplicateFlag: boolean;
}

// ─── AMISCA Program Codes ──────────────────────────────────────────────
// NIM format: [PPP][YY][SSS]
//   PPP = program code (digits 1–3)
//   YY  = enrollment year (digits 4–5)
//   SSS = sequence number (digits 6–8)

export const AMISCA_CORE_PROGRAMS = ["105"] as const;

// ─── Session Extension ─────────────────────────────────────────────────

export interface SessionUser {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: Role;
    status: UserStatus | "pending" | "rejected";
    nim?: string;
    angkatan?: number;
}

// ─── File Types ────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/png",
    "image/jpeg",
    "application/zip",
] as const;

export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export const FILE_TYPE_LABELS: Record<string, string> = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "PPTX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/plain": "TXT",
    "image/png": "PNG",
    "image/jpeg": "JPG",
    "application/zip": "ZIP",
};

// ─── Document Types (Controlled Vocabulary) ───────────────────────────

export const DEFAULT_DOCUMENT_TYPE_CODES = [
    "SLIDE",
    "UJIAN 1",
    "UJIAN 2",
    "UJIAN 3",
    "LATIHAN",
    "SOLUSI",
    "TEXTBOOK",
    "SPEKTRA",
    "KERATIN",
    "OTHER",
] as const;

export type DefaultDocumentTypeCode =
    (typeof DEFAULT_DOCUMENT_TYPE_CODES)[number];

export interface DocumentTypeOption {
    id?: string;
    code: string;
    label: string;
    isSystem?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

/**
 * Canonicalize document type codes so storage and search stay consistent.
 */
export function normalizeDocumentTypeCode(input: string): string {
    const withoutStart = input.replace(/^\s*\[/, "");
    const withoutEnd = withoutStart.replace(/\]\s*$/, "");
    return withoutEnd.trim().replace(/\s+/g, " ").toUpperCase();
}

export function formatDocumentTypeLabel(code: string): string {
    const normalized = normalizeDocumentTypeCode(code);
    return normalized ? `[${normalized}]` : "[OTHER]";
}

export const DEFAULT_DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] =
    DEFAULT_DOCUMENT_TYPE_CODES.map((code, idx) => ({
        code,
        label: formatDocumentTypeLabel(code),
        isSystem: true,
        isActive: true,
        sortOrder: idx,
    }));

// ─── Audit Actions ─────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
    UPLOAD: "upload",
    DOWNLOAD: "download",
    DELETE: "delete",
    EDIT_METADATA: "edit_metadata",
    APPROVE_MEMBER: "approve_member",
    REJECT_MEMBER: "reject_member",
    BULK_APPROVE: "bulk_approve",
    SUSPEND_USER: "suspend_user",
    ROLE_CHANGE: "role_change",
    LOGIN: "login",
    SYNC_GFORM: "sync_gform",
} as const;
