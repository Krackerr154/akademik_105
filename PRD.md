# PRD — Akademik 105
# Platform Arsip Akademik HMK AMISCA ITB

**Versi**: 2.0
**Terakhir diperbarui**: 2026-04-07

---

## 1. Ikhtisar Produk

**Akademik 105** adalah platform arsip akademik digital yang dibangun untuk anggota Divisi Akademik HMK AMISCA (Asosiasi Mahasiswa Kimia) ITB. Platform ini menyediakan repositori terpusat untuk menyimpan, mengelola, dan mengakses catatan kuliah, soal ujian, laporan, dan referensi akademik lainnya.

**Mengapa „105"?** — Kode program `105` adalah kode program studi Kimia di ITB.

### 1.1 Target Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **Anggota** | Mahasiswa Kimia ITB yang telah diverifikasi melalui NIM |
| **Admin** | Pengurus AMISCA yang mengelola anggota dan konten |
| **Superadmin** | Developer / ketua divisi dengan akses penuh |

### 1.2 Masalah yang Diselesaikan

- Arsip akademik tersebar di berbagai platform (Google Drive personal, WhatsApp group, dll)
- Tidak ada sistem pencarian terstruktur untuk materi kuliah
- Tidak ada verifikasi keanggotaan — siapa saja bisa mengakses

---

## 2. Arsitektur Teknis

### 2.1 Stack Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js 14 (App Router) |
| Bahasa | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 |
| Auth | NextAuth v5 (Google OAuth) |
| Database | Turso (libSQL) + Drizzle ORM |
| Storage | Google Drive API v3 (2 service accounts) |
| GForm Sync | Google Sheets API v4 |
| Search | Fuse.js (client-side) |
| Deployment | Vercel (free tier) |

### 2.2 Arsitektur Storage

Platform menggunakan **2 akun Google Drive** sebagai backend penyimpanan:

```
Drive A (15 GB) — Arsip Utama
Drive B (15 GB) — Arsip Cadangan
─────────────────────────────────
Total: 30 GB available
```

**Load Balancer** (`lib/drive/router.ts`):
- Otomatis memilih drive dengan ruang terbanyak
- Cache usage selama 30 menit
- Exclude drive dengan sisa < 100 MB
- Fallback jika satu drive gagal

### 2.3 Alur Autentikasi

```
┌─────────────┐     ┌──────────┐     ┌────────────────────┐
│ Google OAuth │────▶│ NextAuth │────▶│ signIn callback    │
│ (Login)     │     │ v5       │     │ (lifecycle check)  │
└─────────────┘     └──────────┘     └────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                          │                         │
                    ▼                          ▼                         ▼
             ┌──────────┐              ┌────────────┐            ┌──────────┐
             │ users    │              │ pending_   │            │ Not found│
             │ table    │              │ registra-  │            │ → /register
             │          │              │ tions      │            │          │
             └──────────┘              └────────────┘            └──────────┘
              active→✓                  approved→create user
              suspended→/suspended      pending→/waiting
                                        rejected→/rejected
```

---

## 3. Skema Database

### 3.1 Tabel `users`

Anggota aktif yang sudah diverifikasi.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | Email Google |
| name | TEXT | Nama lengkap |
| avatar_url | TEXT | URL foto profil Google |
| nim | TEXT UNIQUE | NIM mahasiswa (8 digit) |
| angkatan | INTEGER | Tahun masuk (e.g. 2021) |
| whatsapp | TEXT | Nomor WhatsApp |
| program | TEXT | 'kimia' / 'teknik_kimia' / 'farmasi' / 'other' |
| role | TEXT | 'superadmin' / 'admin' / 'user' |
| status | TEXT | 'active' / 'suspended' |
| approved_by | TEXT | ID admin yang menyetujui |
| approved_at | INTEGER | Unix timestamp (ms) |
| created_at | INTEGER | Unix timestamp (ms) |
| last_seen | INTEGER | Unix timestamp (ms) |

### 3.2 Tabel `pending_registrations`

Pendaftaran dari GForm yang menunggu review admin.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | Email pendaftar |
| full_name | TEXT | Nama lengkap |
| nim | TEXT | NIM yang disubmit |
| angkatan | INTEGER | Tahun masuk |
| whatsapp | TEXT | Nomor WA |
| program | TEXT | Program studi |
| submitted_at | INTEGER | Timestamp GForm |
| synced_at | INTEGER | Timestamp sinkronisasi |
| approval_status | TEXT | 'pending' / 'approved' / 'rejected' |
| nim_format_valid | INTEGER | 1 = format valid |
| nim_scope_flag | INTEGER | 1 = di luar scope AMISCA (soft flag) |
| nim_year_flag | INTEGER | 1 = ketidaksesuaian tahun (soft flag) |
| nim_duplicate | INTEGER | 1 = NIM duplikat (hard block) |
| reviewed_by | TEXT | ID reviewer |
| reviewed_at | INTEGER | Timestamp review |
| rejection_reason | TEXT | Alasan penolakan |

### 3.3 Tabel `files`

Metadata file yang tersimpan di Google Drive.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT PK | UUID internal |
| title | TEXT | Judul dokumen |
| subject | TEXT | Mata kuliah |
| tags | TEXT | JSON array tags |
| abstract | TEXT | Ringkasan |
| year | INTEGER | Tahun |
| authors | TEXT | Penulis |
| angkatan_tags | TEXT | JSON array angkatan |
| mime_type | TEXT | MIME type |
| size_bytes | INTEGER | Ukuran file |
| sha256 | TEXT | Hash untuk deduplikasi |
| drive_id | TEXT | 'A' atau 'B' |
| gdrive_file_id | TEXT | ID file di Google Drive |
| visibility | TEXT | 'members' / 'admin_only' |
| uploader_id | TEXT | ID uploader |
| created_at | INTEGER | Timestamp (ms) |
| updated_at | INTEGER | Timestamp (ms) |

### 3.4 Tabel `drive_usage`

Cache penggunaan drive untuk load balancing.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| drive_id | TEXT PK | 'A' atau 'B' |
| used_bytes | INTEGER | Bytes terpakai |
| total_bytes | INTEGER | Total kapasitas |
| updated_at | INTEGER | Timestamp update |

### 3.5 Tabel `audit_log`

Log semua aktivitas penting di sistem.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | TEXT PK | UUID |
| user_id | TEXT | ID pelaku |
| action | TEXT | Jenis aksi |
| target_id | TEXT | ID target |
| metadata | TEXT | JSON detail |
| created_at | INTEGER | Timestamp (ms) |

### 3.6 Tabel `settings`

Key-value store untuk konfigurasi sistem.

| Key | Contoh Value |
|-----|-------------|
| gform_sheet_id | 1BxiMVs0... |
| gform_sheet_tab | Form Responses 1 |
| admin_whatsapp | +62xxx |

---

## 4. Validasi NIM

### 4.1 Format NIM

Format NIM ITB adalah 8 digit: `[PPP][YY][SSS]`

```
Contoh: 10521028
  105 → Kimia ITB (Kode Program)
   21 → Angkatan 2021
  028 → Nomor urut 028
```

### 4.2 Lapisan Validasi

| Layer | Tipe | Aksi |
|-------|------|------|
| 1. Format | Hard block | Harus 8 digit numerik, tahun valid |
| 2. Scope | Soft flag | Prefix bukan `105` → flag, tapi admin tetap bisa approve |
| 3. Tahun | Soft flag | NIM year ≠ submitted angkatan (toleransi ±1) |
| 4. Duplikat | Hard block | NIM sudah ada di DB → block |

### 4.3 Program Codes

```
105 → Kimia (AMISCA core)
```

---

## 5. Fitur Utama

### 5.1 Untuk Anggota

- **Jelajahi** — Browse file berdasarkan mata kuliah, angkatan, format
- **Pencarian** — Full-text search via Fuse.js (client-side)
- **Upload** — Kontribusi file ke arsip kolektif
- **Download** — Unduh file via signed URL (1 jam expiry)
- **Detail File** — Metadata lengkap, preview, dan info uploader

### 5.2 Untuk Admin

- **Dashboard** — Overview statistik: total anggota, arsip, storage
- **Antrian Persetujuan** — Review pendaftaran baru dari GForm
- **Sinkronisasi GForm** — Pull data dari Google Sheets
- **Setujui Massal** — Bulk approve berdasarkan angkatan (skip soft flags)
- **Manajemen Pengguna** — Ubah role, suspend, reaktivasi
- **Penggunaan Drive** — Monitor kapasitas Drive A & B
- **Log Audit** — Riwayat semua aktivitas sistem

### 5.3 Untuk Superadmin

- **Pengaturan Sistem** — Konfigurasi Sheet ID, kontak admin, dll
- **Bootstrap** — Auto-create akun pertama via `SUPERADMIN_EMAILS` env var

---

## 6. Alur Pendaftaran Anggota

```
1. Calon anggota mengisi Google Form
2. Data masuk ke Google Sheets
3. Admin klik "Sinkronisasi GForm" di panel admin
4. Sistem membaca Sheets → validasi NIM → insert ke pending_registrations
5. Admin review di antrian:
   - Format invalid → tombol Approve disabled
   - Scope/Year flag → perlu individual review
   - Clean → bisa bulk approve
6. Setelah disetujui, user login via Google → akun otomatis dibuat
```

---

## 7. Keamanan

- **NIM tidak diekspos** — Ditampilkan dalam format masked (`•••••028`)
- **gdrive_file_id tidak diekspos** — Client hanya melihat UUID internal
- **Signed URLs** — Download via URL sementara, expire 1 jam
- **Role hierarchy** — superadmin (3) > admin (2) > user (1)
- **Status + role check** — Setiap request wajib cek kedua-duanya
- **Audit log** — Semua aksi penting dicatat
- **Middleware** — Edge middleware untuk auth + role routing

---

## 8. Environment Variables

```env
# Database (Turso)
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Auth (Google OAuth)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Admin Bootstrap
SUPERADMIN_EMAILS=admin@gmail.com

# Drive A
GDRIVE_A_CLIENT_EMAIL=...
GDRIVE_A_PRIVATE_KEY=...
GDRIVE_A_FOLDER_ID=...

# Drive B
GDRIVE_B_CLIENT_EMAIL=...
GDRIVE_B_PRIVATE_KEY=...
GDRIVE_B_FOLDER_ID=...

# Google Sheets (GForm sync)
GSHEETS_CLIENT_EMAIL=...
GSHEETS_PRIVATE_KEY=...

# Public
NEXT_PUBLIC_GFORM_URL=https://forms.gle/...
```

---

## 9. Deployment

### 9.1 Platform: Vercel (Free Tier)

- Auto-deploy dari GitHub
- Environment variables via Vercel Dashboard
- Edge Functions untuk middleware
- Serverless Functions untuk API routes

### 9.2 Keterbatasan Free Tier

| Limit | Nilai |
|-------|-------|
| Serverless Function timeout | 10 detik |
| Build timeout | 45 menit |
| Bandwidth | 100 GB/bulan |
| Storage | 30 GB (via Google Drive) |

---

## 10. Desain Visual

### 10.1 Design System: "Academic Minimal"

```
Surface:     #faf9f7 (warm off-white)
Primary:     #091526 (ink black)
Secondary:   #086b5b (academic teal)
Accent:      #ffb77d (warm amber, status highlights)
Error:       #ba1a1a (muted red)
Radius:      4px (sm), 12px (md)
Typography:  Manrope (display), Inter (body), Fira Code (mono)
```

### 10.2 Design Principles

1. **No-Line Rule** — Ghost borders (15% opacity inset shadow) instead of visible lines
2. **Ambient Shadow** — Subtle paper-like depth (`0 4px 24px 0 rgba(26,28,27,0.04)`)
3. **Glassmorphism** — For floating search bars and menus
4. **Negative letter-spacing** — Editorial feel for headlines
5. **Uppercase micro-labels** — For metadata and categories
