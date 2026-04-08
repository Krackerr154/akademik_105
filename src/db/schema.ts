import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Users ─────────────────────────────────────────────────────────────
// Verified active members
export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    email: text("email").unique().notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    nim: text("nim").unique().notNull(),
    angkatan: integer("angkatan").notNull(),
    whatsapp: text("whatsapp"),
    program: text("program").notNull(), // 'kimia' | 'teknik_kimia' | 'farmasi' | 'other'
    role: text("role").notNull().default("user"), // 'superadmin' | 'admin' | 'user'
    status: text("status").notNull().default("active"), // 'active' | 'suspended'
    approvedBy: text("approved_by"),
    approvedAt: integer("approved_at"),
    createdAt: integer("created_at").notNull(),
    lastSeen: integer("last_seen"),
});

// ─── Pending Registrations ─────────────────────────────────────────────
// GForm submissions awaiting admin review
export const pendingRegistrations = sqliteTable("pending_registrations", {
    id: text("id").primaryKey(),
    email: text("email").unique().notNull(),
    fullName: text("full_name").notNull(),
    nim: text("nim").notNull(),
    angkatan: integer("angkatan").notNull(),
    whatsapp: text("whatsapp").notNull(),
    program: text("program").notNull(),
    submittedAt: integer("submitted_at").notNull(), // GForm timestamp
    syncedAt: integer("synced_at").notNull(), // when pulled from Sheets
    approvalStatus: text("approval_status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    nimFormatValid: integer("nim_format_valid").notNull().default(0), // 1 = passed
    nimScopeFlag: integer("nim_scope_flag").notNull().default(0), // 1 = outside AMISCA scope (soft)
    nimYearFlag: integer("nim_year_flag").notNull().default(0), // 1 = year mismatch (soft)
    nimDuplicate: integer("nim_duplicate").notNull().default(0), // 1 = NIM already exists (hard)
    reviewedBy: text("reviewed_by"),
    reviewedAt: integer("reviewed_at"),
    rejectionReason: text("rejection_reason"),
});

// ─── Files ─────────────────────────────────────────────────────────────
// Academic files stored across Google Drives
export const files = sqliteTable("files", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    tags: text("tags"), // JSON array
    abstract: text("abstract"),
    year: integer("year"),
    authors: text("authors"),
    angkatanTags: text("angkatan_tags"), // JSON array e.g. ["2022","2023"]
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    driveId: text("drive_id").notNull(), // 'A' | 'B'
    gdriveFileId: text("gdrive_file_id").notNull(),
    visibility: text("visibility").notNull().default("members"), // 'members' | 'admin_only'
    uploaderId: text("uploader_id").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

// ─── Drive Usage ───────────────────────────────────────────────────────
// Cached drive usage for load balancing
export const driveUsage = sqliteTable("drive_usage", {
    driveId: text("drive_id").primaryKey(), // 'A' | 'B'
    usedBytes: integer("used_bytes").notNull(),
    totalBytes: integer("total_bytes").notNull(),
    updatedAt: integer("updated_at").notNull(),
});

// ─── Audit Log ─────────────────────────────────────────────────────────
export const auditLog = sqliteTable("audit_log", {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    action: text("action").notNull(),
    targetId: text("target_id"),
    metadata: text("metadata"), // JSON blob
    createdAt: integer("created_at").notNull(),
});

// ─── Settings ──────────────────────────────────────────────────────────
export const settings = sqliteTable("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});
// Keys: gform_sheet_id, gform_sheet_tab, admin_whatsapp, sync_interval_min
