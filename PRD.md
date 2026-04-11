# Product Requirements Document
# Akademik 105 — AMISCA ITB Academic Archive

**Version:** 1.1.0  
**Status:** Draft  
**Last Updated:** 2025  
**Organization:** HMK AMISCA ITB — Divisi Akademik  

---

## 1. Overview

### 1.1 Product Summary

Akademik 105 is a gated web-based academic file archive exclusively for members of HMK AMISCA ITB (Himpunan Mahasiswa Kimia, Institut Teknologi Bandung). It replaces the previous `bit.ly/akademik_105` Google Drive shortlink with a proper, access-controlled platform.

The system uses two Google Drive accounts as distributed backend storage (30 GB total free), with the dashboard as the sole access layer. All access is gated behind membership verification via a Google Form ("Form Pendataan Anggota") and NIM (Nomor Induk Mahasiswa) validation against ITB's NIM format rules.

### 1.2 Problem Statement

AMISCA's academic division maintains lecture notes, past exam papers, theses, and reference materials valuable exclusively to active members. The previous approach — a shared Drive link via bit.ly — had no access control, no membership verification, no search, and no organization. Anyone with the link could access all files, and there was no audit trail.

### 1.3 Goals

- Restrict access to verified AMISCA members only
- Gate entry through the official Form Pendataan Anggota (Google Form)
- Validate member identity using ITB NIM format as a trust anchor
- Provide a clean, searchable interface for academic files
- Utilize 2 × 15 GB Google Drive accounts as free backend storage
- Keep the entire deployment within Vercel's free tier
- Give Divisi Akademik (admins) full control over member access and content

### 1.4 Non-Goals

- Open registration to non-AMISCA members
- Real-time collaboration or co-editing
- Video streaming or media playback
- Billing or payment processing
- Mobile native app (responsive web only)
- Automated NIM lookup against ITB's live student database (out of scope for v1)

---

## 2. User Roles & Lifecycle

### 2.1 Role Hierarchy

```
SUPERADMIN  →  Developer / system owner. Full access including promoting admins.
ADMIN       →  Kepala & Staff Divisi Akademik HMK AMISCA ITB.
USER        →  Verified active AMISCA members.
PENDING     →  Filled the form, signed in, awaiting admin approval.
SUSPENDED   →  Access revoked (graduated, resigned, or policy violation).
```

### 2.2 Role Capabilities

| Capability | Superadmin | Admin | User | Pending | Suspended |
|------------|:----------:|:-----:|:----:|:-------:|:---------:|
| Browse & search files | ✓ | ✓ | ✓ | ✗ | ✗ |
| Download files | ✓ | ✓ | ✓ | ✗ | ✗ |
| Upload files | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit own file metadata | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete own files | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit / delete any file | ✓ | ✓ | ✗ | ✗ | ✗ |
| Approve / reject members | ✓ | ✓ | ✗ | ✗ | ✗ |
| Sync GForm responses | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage user roles | ✓ | ✓ | ✗ | ✗ | ✗ |
| View drive usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| View audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage system settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Promote / demote admins | ✓ | ✗ | ✗ | ✗ | ✗ |

### 2.3 User Lifecycle State Machine

```
New person
    │
    ▼
Fills Form Pendataan Anggota (Google Form)
    │  collects: nama, email Google, NIM, angkatan, WhatsApp, prodi
    │
    ▼
Signs in to Akademik 105 with Google
    │
    ├─ Email NOT in pending_registrations
    │       → redirect to /register
    │         (shows GForm link + instructions)
    │
    ├─ Email in pending_registrations, NIM format INVALID
    │       → redirect to /register?error=nim
    │         (NIM failed ITB format check — cannot proceed)
    │
    ├─ Email in pending_registrations, NIM valid, status = 'pending'
    │       → redirect to /waiting
    │         (shows admin WA contact for follow-up)
    │
    ├─ Email in pending_registrations, status = 'rejected'
    │       → redirect to /rejected
    │         (shows rejection reason left by admin)
    │
    └─ Email in pending_registrations, status = 'approved'
            → create users record, status = 'active'
            → redirect to / (full access granted)

Active user
    └─ Admin suspends → status = 'suspended' → /suspended
```

---

## 3. NIM Trust Anchor

### 3.1 Purpose

ITB's NIM encodes program and enrollment year in a strict, publicly known format. It serves as the primary trust anchor to verify that a form submission is from an actual ITB student in a Chemistry-scope program — deterring fake registrations without requiring access to ITB's internal systems.

### 3.2 ITB NIM Format

```
Format:  [PPP][YY][SSS]
Length:  8 digits, all numeric

PPP = Program code (digits 1–3)
YY  = Enrollment year, last 2 digits (digits 4–5)
SSS = Sequence number (digits 6–8)

Example: 10521028
  105 → Kimia ITB (Program Studi Kimia)
  21  → Angkatan 2021
  028 → Nomor urut 028

Regex: /^\d{8}$/
```

AMISCA-relevant program identifiers:

| NIM prefix | Program | Flag behavior |
|------------|---------|---------------|
| `105` | Kimia — FMIPA | No flag (core AMISCA) |
| Other | Outside Kimia scope | Soft scope flag |

### 3.3 Validation Layers

**Layer 1 — Format (hard block):**
- Must be exactly 8 digits, all numeric (`/^\d{8}$/`)
- Encoded year (digits 4–5) must be between `98` and `(current year − 2000 + 2)`
- If invalid: block registration, show error, do not create `pending_registrations` record

**Layer 2 — Program scope (soft flag):**
- Extract program digits, compare against known AMISCA-scope codes
- If outside scope: flag `nim_scope_flag = 1` in DB
- Admin sees the flag but can still approve (accommodates special cases)

**Layer 3 — Angkatan consistency (soft flag):**
- NIM-encoded year must match submitted `angkatan` field within ±1 year
- If mismatch > 1 year: flag `nim_year_flag = 1`
- Admin sees the flag; soft block only (accommodates transfer students)

**Layer 4 — Uniqueness (hard block):**
- NIM must not already exist in `pending_registrations` or `users`
- If duplicate: block and show "NIM ini sudah terdaftar. Hubungi admin jika ada masalah."

### 3.4 Limitations (documented honestly)

- Does not verify against ITB's live student database
- Does not confirm current enrollment status
- NIM format check is a deterrent, not cryptographic proof
- Human admin approval remains the final gate

---

## 4. Registration & GForm Sync Flow

### 4.1 Google Form Required Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Nama Lengkap | Short text | Yes | As on KTM |
| Email Google | Short text | Yes | Must match sign-in email |
| NIM | Short text | Yes | 8-digit ITB NIM |
| Angkatan | Short text | Yes | 4-digit year, e.g. 2022 |
| No. WhatsApp | Short text | Yes | Format: 08xxxxxxxxxx |
| Program Studi | Dropdown | Yes | Kimia / Teknik Kimia / Farmasi / Lainnya |
| Pernyataan | Checkbox | Yes | Membership acknowledgment |

The form must be connected to a Google Sheet (Forms does this natively). The Sheet ID is configured in system settings.

### 4.2 Sync Process

1. Admin clicks "Sync dari GForm" in `/admin/members`
2. System calls Google Sheets API using a dedicated service account
3. New rows (by email, deduplicated) are inserted into `pending_registrations`
4. NIM validation runs on each new row; flags written to DB
5. Admin sees the approval queue with flag indicators
6. Admin approves or rejects individually, or bulk-approves by angkatan
7. Approved: `approval_status = 'approved'`; next sign-in creates `users` record
8. Rejected: `approval_status = 'rejected'`, `rejection_reason` stored; member sees reason on `/rejected`

### 4.3 Batch Onboarding (Semester Flow)

At the start of each semester, Divisi Akademik can:
1. Sync all new GForm responses
2. Filter pending queue by current `angkatan`
3. Review flagged NIMs individually
4. Bulk approve all clean (no-flag) entries in one click

---

## 5. Core Features

### 5.1 Authentication & Authorization

- Google OAuth sign-in via NextAuth v5
- On every sign-in, `auth` callback checks email against `pending_registrations` and `users`
- Resolves to the correct redirect based on state (see lifecycle above)
- Sessions as JWT in HTTP-only cookies
- Superadmin bootstrapped via `SUPERADMIN_EMAILS` env var
- Admin role assigned by Superadmin only; cannot be self-assigned

### 5.2 File Upload

- Drag-and-drop or file picker
- Supported types: PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG, ZIP
- Max file size: 500 MB per file
- Required metadata: Title, Subject / Mata Kuliah, Visibility
- Optional metadata: Tags, Abstract, Year, Authors, Angkatan relevance
- Upload bypasses Vercel (resumable upload directly to Google)
- Duplicate detection via SHA-256 hash

### 5.3 File Browser

- Grid and list view
- Sort: date, title, size, subject
- Filter: subject, tags, file type, year, angkatan relevance
- Pagination: 24/page (grid), 50/page (list)

### 5.4 Search

- Global search bar
- Fuse.js client-side fuzzy search over: title, subject, tags, abstract, authors
- URL-persisted query params (`?q=`)

### 5.5 File Detail Page

- All metadata, in-browser PDF/image preview
- Download → signed Drive URL → direct browser download
- Edit / delete controls per role

### 5.6 Admin Panel — Member Management

- `/admin/members`: pending queue with NIM flag indicators (color-coded)
  - Green: no flags
  - Yellow: soft flags (scope or year mismatch) — requires review
  - Red: hard flags (duplicate NIM) — cannot approve
- Approve / Reject per member, with rejection reason field
- Bulk approve by angkatan (only no-flag entries)
- "Sync dari GForm" button (pulls latest Sheet data)
- Shows: nama, NIM, angkatan, prodi, WA, submitted date, flags

### 5.7 Admin Panel — Other

- `/admin/users`: active/suspended users, role management, suspend/unsuspend
- `/admin/drives`: usage gauge per drive, file count, warning >80%
- `/admin/audit`: last 500 actions with user, action, target, timestamp
- `/admin/settings`: GForm Sheet ID, Sheet tab name, admin WA number, sync interval

### 5.8 Storage Load Balancing

- Capacity-aware: pick drive with most free space on each upload
- Round-robin fallback if Drive API is unreachable
- Usage cached in DB, refreshed every 30 minutes
- Never pick a drive with < 100 MB remaining

---

## 6. Technical Architecture

### 6.1 Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 |
| Auth | NextAuth v5 |
| Database | Turso (SQLite, edge-compatible) |
| ORM | Drizzle ORM |
| Storage | Google Drive API v3 (2 service accounts) |
| GForm sync | Google Sheets API v4 (1 service account) |
| Deployment | Vercel (free tier) |
| Search | Fuse.js (client-side) |
| NIM validation | Custom — `lib/nim-validator.ts` |

### 6.2 Database Schema

```sql
-- Verified active members
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  avatar_url   TEXT,
  nim          TEXT UNIQUE NOT NULL,
  angkatan     INTEGER NOT NULL,
  whatsapp     TEXT,
  program      TEXT NOT NULL,          -- 'kimia'|'teknik_kimia'|'farmasi'|'other'
  role         TEXT NOT NULL DEFAULT 'user',
  -- 'superadmin' | 'admin' | 'user'
  status       TEXT NOT NULL DEFAULT 'active',
  -- 'active' | 'suspended'
  approved_by  TEXT REFERENCES users(id),
  approved_at  INTEGER,
  created_at   INTEGER NOT NULL,
  last_seen    INTEGER
);

-- GForm submissions awaiting admin review
CREATE TABLE pending_registrations (
  id               TEXT PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL,
  full_name        TEXT NOT NULL,
  nim              TEXT NOT NULL,
  angkatan         INTEGER NOT NULL,
  whatsapp         TEXT NOT NULL,
  program          TEXT NOT NULL,
  submitted_at     INTEGER NOT NULL,   -- GForm timestamp
  synced_at        INTEGER NOT NULL,   -- when pulled from Sheets
  approval_status  TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'rejected'
  nim_format_valid INTEGER NOT NULL DEFAULT 0,  -- 1 = passed
  nim_scope_flag   INTEGER NOT NULL DEFAULT 0,  -- 1 = outside AMISCA scope (soft)
  nim_year_flag    INTEGER NOT NULL DEFAULT 0,  -- 1 = year mismatch (soft)
  nim_duplicate    INTEGER NOT NULL DEFAULT 0,  -- 1 = NIM already exists (hard)
  reviewed_by      TEXT REFERENCES users(id),
  reviewed_at      INTEGER,
  rejection_reason TEXT
);

-- Academic files
CREATE TABLE files (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  subject         TEXT NOT NULL,
  tags            TEXT,                -- JSON array
  abstract        TEXT,
  year            INTEGER,
  authors         TEXT,
  angkatan_tags   TEXT,               -- JSON array e.g. ["2022","2023"]
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  sha256          TEXT NOT NULL,
  drive_id        TEXT NOT NULL,      -- 'A' | 'B'
  gdrive_file_id  TEXT NOT NULL,
  visibility      TEXT NOT NULL DEFAULT 'members',
  -- 'members' | 'admin_only'
  uploader_id     TEXT NOT NULL REFERENCES users(id),
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

-- Drive usage cache
CREATE TABLE drive_usage (
  drive_id    TEXT PRIMARY KEY,
  used_bytes  INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- Audit log
CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id),
  action      TEXT NOT NULL,
  target_id   TEXT,
  metadata    TEXT,                   -- JSON blob
  created_at  INTEGER NOT NULL
);

-- System settings
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: gform_sheet_id, gform_sheet_tab, admin_whatsapp, sync_interval_min
```

### 6.3 API Routes

| Method | Route | Description | Min Role |
|--------|-------|-------------|----------|
| GET | `/api/files` | List files | user |
| GET | `/api/files/[id]` | File metadata | user |
| POST | `/api/upload/init` | Init resumable upload | user |
| POST | `/api/upload/complete` | Save metadata | user |
| GET | `/api/files/[id]/download` | Signed Drive URL | user |
| PATCH | `/api/files/[id]` | Edit metadata | user (own) / admin |
| DELETE | `/api/files/[id]` | Delete file | user (own) / admin |
| GET | `/api/admin/members` | Pending queue | admin |
| POST | `/api/admin/members/sync` | Sync from GForm | admin |
| PATCH | `/api/admin/members/[id]` | Approve / reject | admin |
| POST | `/api/admin/members/bulk-approve` | Bulk approve | admin |
| GET | `/api/admin/users` | List users | admin |
| PATCH | `/api/admin/users/[id]` | Change role / status | admin |
| GET | `/api/admin/drives` | Drive usage | admin |
| GET | `/api/admin/audit` | Audit log | admin |
| GET | `/api/settings` | Public settings | public |
| PATCH | `/api/admin/settings` | Update settings | superadmin |

### 6.4 Environment Variables

```env
# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Database
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Google Drive — Account A
GDRIVE_A_CLIENT_EMAIL=
GDRIVE_A_PRIVATE_KEY=
GDRIVE_A_FOLDER_ID=

# Google Drive — Account B
GDRIVE_B_CLIENT_EMAIL=
GDRIVE_B_PRIVATE_KEY=
GDRIVE_B_FOLDER_ID=


# Google Sheets (GForm sync — separate service account)
GSHEETS_CLIENT_EMAIL=
GSHEETS_PRIVATE_KEY=

# App config
NEXT_PUBLIC_APP_NAME="Akademik 105"
NEXT_PUBLIC_ORG_NAME="HMK AMISCA ITB"
NEXT_PUBLIC_GFORM_URL=https://forms.gle/yourformid
SUPERADMIN_EMAILS=your-email@gmail.com
```

### 6.5 Vercel Free Tier Compliance

| Constraint | Limit | Strategy |
|------------|-------|----------|
| Serverless timeout | 10s | Upload bypasses Vercel; metadata calls only |
| Bandwidth | 100 GB/month | Signed URL redirect — downloads bypass Vercel |
| Function invocations | 100k/month | Metadata-only API calls; file bytes never proxied |
| Build time | 45 min/month | Static rendering for /register, /waiting, /rejected |

---

## 7. Pages & UI

### 7.1 Page Map

```
/                       → Browse — User+
/search                 → Search — User+
/file/[id]              → File detail + preview — User+
/upload                 → Upload form — User+
/register               → "Fill the GForm" gate page — Unauthenticated
/waiting                → Pending approval — Pending status
/rejected               → Rejection notice — Rejected status
/suspended              → Suspended notice — Suspended status
/admin                  → Admin dashboard — Admin+
/admin/members          → Approval queue + GForm sync — Admin+
/admin/users            → User management — Admin+
/admin/drives           → Drive usage — Admin+
/admin/audit            → Audit log — Admin+
/admin/settings         → System settings — Superadmin
```

Every route group must include `loading.tsx` (skeleton) and `error.tsx` (error boundary) files:
- `(member)/loading.tsx`, `(member)/error.tsx`
- `(public)/loading.tsx`, `(public)/error.tsx`
- `admin/loading.tsx`, `admin/error.tsx`

Sign-in and error pages use NextAuth v5 defaults (`/api/auth/signin`, `/api/auth/error`).

### 7.2 Design System

- Theme: "Academic Minimal"
- Background: `#F9F8F6` (warm off-white)
- Primary: `#1E2A3B` (deep navy)
- Accent: `#2A7F6F` (muted teal)
- Warning/tag: `#D97706` (amber)
- Typography: Inter (body), monospace (metadata — NIM partial, file size, dates)
- NIM display: show only last 3 digits to other users (`•••••001`)
- Language: Indonesian throughout all UI strings

---

## 8. Non-Functional Requirements

### 8.1 Performance
- FCP < 1.5s on home page
- API responses < 300ms
- Search results < 100ms (client-side)
- GForm sync < 5s for up to 500 new rows

### 8.2 Security
- All file access gated behind `status = 'active'` on every request
- Signed Drive URLs expire in 1 hour
- NIM stored as plaintext in DB (student ID, not a secret — per rules.md §4)
- API routes validate session and role on every request
- File type validation on both client and server
- No credentials in client-side code

### 8.3 Reliability
- One drive unreachable → uploads route to the remaining drive
- Failed uploads → orphaned Drive files cleaned up
- GForm sync is idempotent (safe to run multiple times)
- DB is source of truth; Drive is dumb storage

---

## 9. Out of Scope (v1)

- Automated NIM verification against ITB's live database
- Email / push notifications (WhatsApp is the channel)
- File comments or annotations
- Batch ZIP download
- Per-angkatan file visibility (planned v2)
- GForm webhook (auto-trigger sync on new submission)

---

## 10. Success Metrics

- Zero unauthorized access (non-members accessing files)
- Member approval turnaround < 24 hours during active semester
- Upload success rate > 99%
- Drive usage balanced within 20% across both accounts
- NIM format validation catches > 95% of invalid/fake submissions
- Deployment stays within Vercel free tier limits