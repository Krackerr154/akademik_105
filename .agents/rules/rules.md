---
trigger: always_on
---

# Akademik 105 (HMK AMISCA ITB) — Agent Rules

## 1. Stack
Next.js 14 App Router · TypeScript 5 strict · Tailwind CSS v3 · NextAuth v5 beta (Google OAuth) · Turso + libsql + Drizzle ORM · Google Drive API v3 (service accounts) · Google Sheets API v4 (separate service account) · Fuse.js (client-side search) · Vercel free tier

## 2. Project Structure
```
src/
├── app/
│   ├── (public)/          # register, waiting, rejected, suspended pages
│   ├── (member)/          # page.tsx, search, file/[id], upload
│   ├── admin/             # page, members, users, drives, audit, settings
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── files/route.ts + [id]/route.ts + [id]/download/route.ts
│   │   ├── upload/init/route.ts + complete/route.ts
│   │   └── admin/ members(route,sync,bulk-approve,[id]) users(route,[id]) drives audit settings
│   ├── layout.tsx, globals.css
├── components/ui/ file/ upload/ admin/ layout/
├── lib/
│   ├── drive/adapter.ts + router.ts + signed-url.ts
│   ├── sheets/sync.ts
│   ├── nim-validator.ts, auth.ts, db.ts, utils.ts
├── db/schema.ts + migrations/
├── types/index.ts
└── middleware.ts           # Edge: auth + role routing
```

## 3. Auth & Role Rules ⚠️ CRITICAL

**Every API route + server component must check both:**
```typescript
if (!session) return redirect('/auth/signin');
if (session.user.status !== 'active') return redirect('/waiting');
if (session.user.role === 'pending') return redirect('/waiting');
```
Never check role without also checking `status`. Suspended users with roles must still be blocked.

**Role hierarchy:**
```typescript
const ROLE_WEIGHT = { superadmin: 3, admin: 2, user: 1 } as const;
function hasMinRole(userRole: string, minRole: keyof typeof ROLE_WEIGHT): boolean {
  return (ROLE_WEIGHT[userRole as keyof typeof ROLE_WEIGHT] ?? 0) >= ROLE_WEIGHT[minRole];
}
// Always use hasMinRole() — never raw string comparison
```

**Status constants:**
```typescript
const USER_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended' } as const;
const APPROVAL_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' } as const;
```

**signIn callback order:**
1. Email in `users` + `status=active` → allow
2. Email in `users` + `status=suspended` → deny, store `suspendedReason` in session
3. Email in `pending_registrations` + `approved` → create user record, allow
4. Email in `pending_registrations` + `pending` → allow, session `status=pending`
5. Email in `pending_registrations` + `rejected` → allow, session `status=rejected`
6. Email not found anywhere → redirect `/register`

Session callback must attach: `status`, `role`, `nim` (masked), `angkatan`.

**Superadmin bootstrap:** `SUPERADMIN_EMAILS` env var only. If email matches and not in `users`, create with `role=superadmin`, `status=active`, skip GForm check.

## 4. NIM Validation

```typescript
// lib/nim-validator.ts
interface NimValidationResult {
  formatValid: boolean;        // hard block if false
  encodedYear: number | null;
  encodedProgram: string | null;
  scopeFlag: boolean;          // soft — admin sees, can still approve
  yearFlag: boolean;           // soft — NIM year vs angkatan mismatch
  duplicateFlag: boolean;      // hard block if true
}
const AMISCA_CORE_PROGRAMS = ['522', '523'] as const;    // Kimia, Farmasi FMIPA
const AMISCA_RELATED_PROGRAMS = ['352'] as const;         // Teknik Kimia FTI
```

- Run `validateNim()` during GForm sync only, not at sign-in
- Store all flags in `pending_registrations` — results are immutable after sync
- `nim_format_valid=0` OR `nim_duplicate=1` → hard block, Approve button disabled in UI
- Never show full NIM to non-owners/non-admins. Masked = last 3 digits: `•••••001`
- Implement `formatNimMasked(nim: string): string` in `lib/utils.ts`
- NIM stored as plaintext (student ID, not secret). Never include in public API responses.
- NIM included only in admin API responses (`/api/admin/members`, `/api/admin/users`)
- `nim` column in `users` has UNIQUE constraint. Check for duplicates across both tables before inserting to `pending_registrations`.

## 5. GForm Sync

```typescript
// lib/sheets/sync.ts
// 1. Read all rows from configured Sheet tab (Sheet ID + tab from settings table)
// 2. Extract: email, full_name, nim, angkatan, whatsapp, program, submitted_at
// 3. Skip if email exists in pending_registrations (idempotent)
// 4. Skip if email exists in users (already member)
// 5. Run validateNim() on each new row
// 6. Insert into pending_registrations with all flags
// 7. Return { added, skipped, errors }
```

- Separate service account for Sheets (`GSHEETS_CLIENT_EMAIL`, `GSHEETS_PRIVATE_KEY`) — never reuse Drive accounts
- Sheet must be shared with Sheets service account (Editor). Sheet ID/tab in `settings` table, never hardcoded.
- Sync is read-only — never modify/delete Sheet rows
- Log every sync to `audit_log`: `action='sync_gform'`, metadata `{ added, skipped }`

**Bulk approve** (`POST /api/admin/members/bulk-approve`, body `{ angkatan: number }`):
Approves where: `angkatan=X` AND `nim_format_valid=1` AND `nim_duplicate=0` AND `approval_status=pending`
Skips records with `nim_scope_flag=1` or `nim_year_flag=1` (require individual review)

## 6. Google Drive Adapter

- 3 Drive accounts (A, B, C), service accounts only, credentials lazy-loaded from env vars
- **Upload:** save `drive_id` + `gdrive_file_id` to DB atomically. If DB write fails → delete Drive file.
- **Delete:** Drive first, then DB. If Drive delete fails → do NOT delete from DB, log and alert.
- Never expose `gdrive_file_id` to client — client sees internal UUID only.
- **Load balancer:** use cached `drive_usage` (fresh within 30 min); if stale, query Drive API. Exclude drives with <100 MB remaining or failed API queries.
- **Signed URLs:** expire in 3600s, server-side only, log every download to `audit_log`
- **Upload flow:** resumable upload protocol. Vercel never receives file bytes. Client uploads directly to Google via URI from `/api/upload/init`. `/api/upload/complete` verifies file exists on Drive before saving metadata.

## 7. Database

- All schema changes via Drizzle migrations (`drizzle-kit generate`). Never alter DB directly.
- `schema.ts` = single source of truth
- Every table has `created_at` (integer, Unix timestamp ms)
- UUIDs (`crypto.randomUUID()`) for all PKs
- Drizzle handles parameterization — never string-concatenate SQL

**Audit log required for:** upload, download, delete, edit_metadata, approve_member, reject_member, bulk_approve, suspend_user, role_change, login, sync_gform

## 8. Security

- Every API route: validate session + `status=active` before any logic
- Role checks via `hasMinRole()` only
- `admin_only` files never appear in `/api/files` for non-admins
- File type: validate MIME type header AND extension — reject mismatches
- Never log: credentials, signed URLs, auth tokens, raw NIMs
- Admin WA number in settings table, shown only on `/waiting` page

## 9. Code Style

**TypeScript:** strict, no `any` (use `unknown` + type guards), explicit types everywhere, `interface` for objects, `type` for unions, `as const` (no `enum`), no non-null assertions (`!`) in production

**React/Next.js:** named exports, Server Components by default, `'use client'` only when needed, `next/image` + `next/link`, always add `loading.tsx` + `error.tsx` per page

**API routes:**
```typescript
// Required pattern every route:
const session = await getServerSession(authOptions);
if (!session || session.user.status !== 'active') return NextResponse.json({ error: '...' }, { status: 401 });
// Zod validation on all request bodies
// Never return stack traces
```

**Styling:** Tailwind only, `cn()` from `lib/utils.ts`, dark mode via `dark:` variants, **all UI strings in Indonesian** ("Setujui", "Tolak", "Sinkronisasi GForm")

## 10. Vercel Constraints

- No `fs.writeFile` at runtime (read-only filesystem)
- API routes: <5s logic (10s hard timeout)
- No binary proxying — signed URL redirects only
- No native Node.js addons
- Edge Middleware: Edge Runtime APIs only
- Env vars in Vercel dashboard only, never `.env` in production

## 11. Naming

| Thing | Convention |
|---|---|
| Files/folders | kebab-case |
| React components | PascalCase |
| Functions | camelCase |
| Constants | SCREAMING_SNAKE_CASE |
| DB tables | snake_case |
| Env vars | SCREAMING_SNAKE_CASE |
| API response fields | camelCase |
| UI strings | Indonesian |

## 12. Hard Prohibitions

- No Pages Router, no Express/Fastify, no `axios`, no `moment.js`, no `localStorage` for auth
- No hardcoded Drive folder IDs, Sheet IDs, or service account keys
- Never approve `pending_registrations` with `nim_format_valid=0` or `nim_duplicate=1`
- Never expose full NIM in client-facing responses
- Never bypass `status=active` check by relying on role alone
- Never write migration files by hand
- Never reuse Drive service accounts for Sheets API
- Never make Sheets sync modify/delete rows