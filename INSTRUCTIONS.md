# INSTRUCTIONS.md
# Panduan Setup & Penggunaan — Akademik 105
# HMK AMISCA ITB — Divisi Akademik

Panduan ini mencakup seluruh proses setup dari awal, termasuk semua credentials, API key, dan konfigurasi. Ikuti langkah-langkah berikut secara berurutan.

**Estimasi waktu setup: 60–90 menit**

---

## Prasyarat

Sebelum mulai, pastikan kamu sudah punya:

- Akun [Vercel](https://vercel.com) (gratis)
- Akun [GitHub](https://github.com) (untuk deployment)
- **Dua akun Google terpisah** untuk storage Drive (bisa akun Gmail biasa)
- **Satu akun Google** untuk OAuth login pengguna (bisa salah satu dari dua di atas, atau berbeda)
- **Satu akun Google** untuk akses Google Sheets (untuk GForm sync — bisa salah satu yang sudah ada)
- Node.js 18+ terinstall di lokal
- `npm` atau `pnpm` terinstall

---

## Bagian 1: Setup Google Drive (Ulangi untuk 2 Akun)

Ulangi seluruh bagian ini dua kali — untuk Akun A dan B.

### Langkah 1.1 — Buat Google Cloud Project

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Login dengan Akun Google A (Drive pertama)
3. Klik dropdown project di atas → **New Project**
4. Nama project: `akademik105-drive-a` → klik **Create**
5. Pilih project yang baru dibuat

### Langkah 1.2 — Aktifkan Google Drive API

1. Sidebar kiri → **APIs & Services → Library**
2. Cari **Google Drive API** → klik **Enable**

### Langkah 1.3 — Buat Service Account

1. **APIs & Services → Credentials**
2. **+ Create Credentials → Service Account**
3. Nama: `akademik105-storage` → klik **Create and Continue**
4. Skip assignment role → klik **Done**

### Langkah 1.4 — Download Service Account Key

1. Klik service account yang baru dibuat
2. Tab **Keys** → **Add Key → Create New Key → JSON → Create**
3. File JSON terdownload otomatis — simpan baik-baik
4. Buka file JSON tersebut, catat:
   - `client_email` → ini adalah `GDRIVE_A_CLIENT_EMAIL`
   - `private_key` → ini adalah `GDRIVE_A_PRIVATE_KEY`

### Langkah 1.5 — Buat Folder Shared di Google Drive

1. Buka [drive.google.com](https://drive.google.com) — login sebagai Akun A
2. **+ New → New Folder** → nama: `Akademik 105 Storage`
3. Klik kanan folder → **Share**
4. Paste `client_email` dari langkah 1.4 → permission: **Editor** → **Send**
5. Klik kanan folder lagi → **Get link**
6. Copy folder ID dari URL:
   ```
   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ```
   Ini adalah `GDRIVE_A_FOLDER_ID`

### Langkah 1.6 — Ulangi untuk Akun B

Login ke Akun Google B, ulangi langkah 1.1–1.5:
- Akun B → `GDRIVE_B_CLIENT_EMAIL`, `GDRIVE_B_PRIVATE_KEY`, `GDRIVE_B_FOLDER_ID`

---

## Bagian 2: Setup Google OAuth (Login Pengguna)

### Langkah 2.1 — Buat OAuth App

1. Buka [console.cloud.google.com](https://console.cloud.google.com) — buat project baru: `akademik105-auth`
2. **APIs & Services → OAuth consent screen**
3. Pilih **External** → **Create**
4. Isi:
   - **App name:** Akademik 105
   - **User support email:** email kamu
   - **Developer contact:** email kamu
5. **Save and Continue** di semua step

### Langkah 2.2 — Buat OAuth Credentials

1. **APIs & Services → Credentials → + Create Credentials → OAuth Client ID**
2. Application type: **Web application**
3. Name: `Akademik 105 Web`
4. **Authorized redirect URIs** — tambahkan:
   - Untuk development: `http://localhost:3000/api/auth/callback/google`
   - Untuk production: `https://akademik105.vercel.app/api/auth/callback/google`
   (URL Vercel akan dikonfirmasi setelah deployment di Bagian 4)
5. **Create** → catat:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET`

---

## Bagian 3: Setup Google Sheets (Untuk Sync GForm)

Service account ini digunakan khusus untuk membaca responses GForm dari Google Sheets. Gunakan salah satu Google Cloud project yang sudah ada (misalnya project Drive A).

### Langkah 3.1 — Aktifkan Google Sheets API

1. Buka project `akademik105-drive-a` di Google Cloud Console
2. **APIs & Services → Library** → cari **Google Sheets API** → **Enable**

### Langkah 3.2 — Buat Service Account untuk Sheets

1. **APIs & Services → Credentials → + Create Credentials → Service Account**
2. Nama: `akademik105-sheets` → **Create and Continue** → **Done**
3. Tab **Keys → Add Key → Create New Key → JSON → Create**
4. Catat dari file JSON:
   - `client_email` → `GSHEETS_CLIENT_EMAIL`
   - `private_key` → `GSHEETS_PRIVATE_KEY`

---

## Bagian 4: Setup Google Form (Form Pendataan Anggota)

### Langkah 4.1 — Buat Google Form

Buat form baru di [forms.google.com](https://forms.google.com) dengan field berikut (urutan ini penting untuk sync):

| No. | Field | Tipe | Required |
|-----|-------|------|----------|
| 1 | Nama Lengkap | Short answer | Ya |
| 2 | Email Google (yang dipakai login) | Short answer | Ya |
| 3 | NIM | Short answer | Ya |
| 4 | Angkatan (tahun masuk, contoh: 2022) | Short answer | Ya |
| 5 | No. WhatsApp (format: 08xxx) | Short answer | Ya |
| 6 | Program Studi | Dropdown | Ya |
| 7 | Pernyataan Keanggotaan | Checkbox | Ya |

Untuk field **Program Studi**, isi pilihan: Kimia, Teknik Kimia, Farmasi, Lainnya

Untuk field **Pernyataan**, teks checkbox: "Saya adalah anggota aktif HMK AMISCA ITB dan menyetujui ketentuan penggunaan Akademik 105"

### Langkah 4.2 — Hubungkan ke Google Sheets

1. Di Google Form → klik tab **Responses**
2. Klik ikon Sheets (hijau) → **Create a new spreadsheet**
3. Nama spreadsheet: `Akademik 105 - Form Pendataan`
4. Buka spreadsheet yang terbuat → copy **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   ```
   Ini akan dimasukkan ke settings aplikasi nanti (bukan env var)

### Langkah 4.3 — Share Sheet ke Service Account

1. Buka spreadsheet → klik **Share**
2. Paste `GSHEETS_CLIENT_EMAIL` (dari Langkah 3.2)
3. Permission: **Viewer** (hanya butuh read) → **Send**

### Langkah 4.4 — Catat Nama Tab Sheet

Default nama tab adalah `Form Responses 1`. Catat ini — akan dimasukkan ke settings aplikasi.

---

## Bagian 5: Setup Database (Turso)

### Langkah 5.1 — Buat Akun Turso

1. Buka [turso.tech](https://turso.tech) → klik **Sign Up** (gratis)
2. Bisa daftar dengan GitHub atau Google

### Langkah 5.2 — Buat Database via Dashboard

1. Buka [app.turso.tech](https://app.turso.tech) → login
2. Klik **Create Database**
3. Nama database: `akademik105`
4. Pilih region terdekat (contoh: `sin` untuk Singapore)
5. Klik **Create**

### Langkah 5.3 — Ambil Credentials

1. Di dashboard, klik database `akademik105` yang baru dibuat
2. Copy **Database URL** (format: `libsql://akademik105-username.turso.io`)
   → Ini adalah `TURSO_DATABASE_URL`
3. Klik **Create Token** (atau **Generate Token**) → copy token yang muncul
   → Ini adalah `TURSO_AUTH_TOKEN`

> **Catatan:** Turso CLI hanya tersedia untuk macOS dan Linux (atau Windows via WSL). Untuk pengguna Windows, gunakan dashboard web di atas. Jika ingin menggunakan CLI, install WSL terlebih dahulu (`wsl --install` di PowerShell).

---

## Bagian 6: Deploy ke Vercel

### Langkah 6.1 — Fork dan Clone Repository

```bash
git clone https://github.com/your-username/akademik105
cd akademik105
npm install
```

### Langkah 6.2 — Buat Vercel Project

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repository GitHub
3. Framework: **Next.js** (terdeteksi otomatis)
4. **Jangan deploy dulu** — klik **Configure Project** terlebih dahulu

### Langkah 6.3 — Tambahkan Environment Variables

Di **Settings → Environment Variables**, tambahkan semua variabel berikut:

> **Penting untuk `PRIVATE_KEY`:** Paste seluruh isi key termasuk baris `-----BEGIN RSA PRIVATE KEY-----` dan `-----END RSA PRIVATE KEY-----`. Vercel mendukung nilai multiline.

```
# Auth
NEXTAUTH_SECRET          → Generate: openssl rand -base64 32
NEXTAUTH_URL             → https://akademik105.vercel.app (update setelah deploy pertama)
GOOGLE_CLIENT_ID         → 320960239118-fq5cg9qfva1rq1var0bveua1ejk69h9v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET     → (dari cred/OAuth_cred.json → client_secret)

# Database (Turso)
TURSO_DATABASE_URL       → libsql://akademik105-krackerr154.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN          → (dari cred/turso_cred.md)

# Google Drive — Akun A
GDRIVE_A_CLIENT_EMAIL    → akademik105-storage@akademik105-drive-a.iam.gserviceaccount.com
GDRIVE_A_PRIVATE_KEY     → (dari cred/drive_1_cred.json → private_key)
GDRIVE_A_FOLDER_ID       → 1PmECo6tOtrCt0WZ44NS-t7HQb-pSMDzV

# Google Drive — Akun B
GDRIVE_B_CLIENT_EMAIL    → akademik105-storage@akademik105-drive-b.iam.gserviceaccount.com
GDRIVE_B_PRIVATE_KEY     → (dari cred/drive_2_cred.json → private_key)
GDRIVE_B_FOLDER_ID       → 1gQcYidCs0M5OLWv4XrrOjoc8Qxm8KbVC

# Google Sheets (GForm sync)
GSHEETS_CLIENT_EMAIL     → akademik105-sheets@akademik105-auth.iam.gserviceaccount.com
GSHEETS_PRIVATE_KEY      → (dari cred/sheet_cred.json → private_key)

# App config
NEXT_PUBLIC_APP_NAME     → Akademik 105
NEXT_PUBLIC_ORG_NAME     → HMK AMISCA ITB
NEXT_PUBLIC_GFORM_URL    → Link Google Form dari Bagian 4 (https://forms.gle/xxx)
SUPERADMIN_EMAILS        → email-kamu@gmail.com
```

> **Catatan:** Semua file credential asli tersimpan di folder `cred/` (sudah di-gitignore). File `.env.local` sudah dibuat otomatis dari credential tersebut.

### Langkah 6.4 — Deploy

1. Klik **Deploy**
2. Tunggu build selesai (~2–3 menit)
3. Copy URL Vercel yang diberikan (contoh: `https://akademik105-xxx.vercel.app`)

### Langkah 6.5 — Update OAuth Redirect URI

1. Kembali ke Google Cloud Console → project OAuth → **Credentials → OAuth Client**
2. Tambahkan di **Authorized redirect URIs**:
   ```
   https://akademik105-xxx.vercel.app/api/auth/callback/google
   ```
3. **Save**

### Langkah 6.6 — Update NEXTAUTH_URL

1. Vercel → **Settings → Environment Variables**
2. Edit `NEXTAUTH_URL` → masukkan URL Vercel yang benar
3. **Deployments** → tiga titik di deployment terbaru → **Redeploy**

---

## Bagian 7: Inisialisasi Database

Setelah deploy pertama berhasil, jalankan migrasi database dari lokal:

```bash
npm run db:migrate
```

Ini membuat semua tabel di Turso. Cukup dilakukan sekali.

---

## Bagian 8: Login Pertama & Setup Admin

### Langkah 8.1 — Login sebagai Superadmin

1. Buka URL aplikasi
2. Klik **Masuk dengan Google**
3. Login menggunakan akun yang emailnya ada di `SUPERADMIN_EMAILS`
4. Kamu langsung mendapat akses penuh sebagai Superadmin
5. Buka `/admin` untuk verifikasi

### Langkah 8.2 — Konfigurasi Awal di System Settings

Buka `/admin/settings` dan isi:

| Setting | Nilai |
|---------|-------|
| Google Sheet ID | ID spreadsheet dari Langkah 4.2 |
| Nama Tab Sheet | `Form Responses 1` (atau sesuai sheet kamu) |
| No. WhatsApp Admin | Nomor WA Divisi Akademik (ditampilkan di halaman /waiting) |
| Interval Sync (menit) | `60` (default) |

### Langkah 8.3 — Promosikan Admin Divisi Akademik

Cara 1 — jika Kepala/Staff Divisi sudah login dan muncul di pending:
1. Approve dulu sebagai member biasa (User)
2. Buka `/admin/users` → cari nama mereka → **Ubah Role → Admin**

Cara 2 — jika belum punya akun:
1. Minta mereka isi GForm terlebih dahulu
2. Sync GForm → approve → lalu ubah role ke Admin

---

## Bagian 9: Workflow Admin Divisi Akademik

### 9.1 Menyetujui Anggota Baru

1. Buka `/admin/members`
2. Klik **Sinkronisasi dari GForm** untuk menarik data terbaru
3. Lihat antrian pending:
   - **Hijau** = tidak ada masalah — aman di-approve
   - **Kuning** = ada flag lunak (NIM di luar scope AMISCA, atau tahun tidak cocok) — perlu diperiksa manual
   - **Merah** = NIM tidak valid atau duplikat — **tidak bisa di-approve**
4. Klik **Setujui** untuk anggota yang bersih, atau **Tolak** dengan alasan penolakan

### 9.2 Approval Massal (Awal Semester)

1. Di `/admin/members` → filter berdasarkan angkatan
2. Klik **Setujui Semua (Angkatan XXXX)**
3. Sistem otomatis meng-approve semua yang tidak punya flag merah atau kuning
4. Yang berflag kuning tetap harus di-review satu per satu

### 9.3 Memahami Flag NIM

| Flag | Warna | Artinya | Tindakan |
|------|-------|---------|----------|
| Tidak ada flag | Hijau | NIM valid, prodi AMISCA, tahun cocok | Approve langsung |
| `nim_scope_flag` | Kuning | Prodi di luar Kimia/Farmasi | Verifikasi manual — mungkin anggota interdisiplin |
| `nim_year_flag` | Kuning | Tahun di NIM ≠ angkatan yang diisi | Verifikasi — mungkin mahasiswa transfer |
| `nim_format_valid = 0` | Merah | Format NIM salah (bukan 8 digit angka) | Tidak bisa di-approve. Minta anggota isi ulang form |
| `nim_duplicate` | Merah | NIM sudah terdaftar di akun lain | Hubungi anggota — kemungkinan typo email |

### 9.4 Menolak Pendaftaran

1. Klik **Tolak** di samping nama anggota
2. Isi alasan penolakan (akan ditampilkan ke anggota di halaman `/rejected`)
3. Contoh alasan: "NIM tidak sesuai format ITB. Silakan isi ulang form dengan NIM yang benar."

### 9.5 Menonaktifkan Akun Anggota

1. Buka `/admin/users`
2. Cari nama pengguna → klik **Nonaktifkan**
3. Akun langsung tidak bisa login — diarahkan ke halaman `/suspended`
4. Untuk mengaktifkan kembali: klik **Aktifkan kembali**

### 9.6 Monitoring Drive

1. Buka `/admin/drives`
2. Lihat penggunaan Drive A dan B
3. **Warning kuning** muncul jika drive > 80% penuh
4. Jika salah satu drive penuh, sistem otomatis tidak akan mengupload ke drive tersebut
5. Hubungi developer untuk tambah kapasitas jika diperlukan

---

## Bagian 10: Panduan Pengguna (Member AMISCA)

### 10.1 Cara Mendapatkan Akses

1. Isi **Form Pendataan Anggota** di link yang dibagikan oleh Divisi Akademik
   - Pastikan email Google yang kamu isi adalah yang **sama** dengan yang akan kamu pakai login
   - Isi NIM dengan benar (8 digit angka, contoh: 10522001)
2. Buka [akademik105.vercel.app](https://akademik105.vercel.app) → klik **Masuk dengan Google**
3. Login dengan email yang sama dengan yang kamu isi di form
4. Jika form belum diproses, kamu akan masuk ke halaman **menunggu persetujuan**
5. Setelah disetujui admin, kamu bisa langsung mengakses semua file

### 10.2 Upload File

1. Klik **Upload** di navigasi atas
2. Drag & drop file, atau klik untuk pilih file
3. Isi metadata:
   - **Judul** (wajib): nama deskriptif, contoh "Catatan Kimia Organik 2 — Pertemuan 5"
   - **Mata Kuliah** (wajib): pilih dari dropdown atau ketik sendiri
   - **Tags** (opsional): kata kunci dipisah koma, contoh `organik, mekanisme, substitusi`
   - **Deskripsi** (opsional): ringkasan isi file
   - **Tahun** (opsional): tahun dokumen
   - **Penulis** (opsional): nama penulis atau sumber
   - **Relevan untuk angkatan** (opsional): contoh `2022, 2023`
   - **Visibilitas**: Semua Anggota (default) atau Admin Only
4. Klik **Upload** — jangan tutup tab selama proses berlangsung

### 10.3 Mencari File

- Gunakan search bar di bagian atas untuk cari berdasarkan judul, mata kuliah, tag, atau deskripsi
- Gunakan filter di sebelah kiri untuk mempersempit berdasarkan mata kuliah, tipe file, atau tahun
- Klik judul file untuk membuka halaman detail

### 10.4 Download File

1. Klik file yang ingin didownload
2. Di halaman detail, klik **Download**
3. File langsung terdownload dari Google Drive
4. Link download berlaku 1 jam — jika kedaluwarsa, klik Download lagi

### 10.5 Preview File

- PDF dan gambar bisa langsung dilihat di halaman detail tanpa perlu download
- Format lain (DOCX, XLSX, dll.) perlu didownload terlebih dahulu

---

## Bagian 11: Troubleshooting

### "Login gagal" saat pertama kali masuk

- Pastikan `NEXTAUTH_URL` di Vercel sudah sesuai URL deploy yang benar (tanpa trailing slash)
- Cek redirect URI di Google OAuth sudah ditambahkan URL Vercel-nya
- Redeploy setelah mengubah env vars

### Upload gagal / tidak ada progress

- Cek Vercel function logs (Dashboard → Functions)
- Pastikan `client_email` service account punya akses **Editor** ke folder Drive
- Pastikan `GDRIVE_*_FOLDER_ID` adalah ID folder saja (bukan URL lengkap)

### Sync GForm tidak menarik data terbaru

- Cek apakah `GSHEETS_CLIENT_EMAIL` sudah di-share ke spreadsheet sebagai **Viewer**
- Pastikan nama tab Sheet di `/admin/settings` sudah benar (default: `Form Responses 1`)
- Cek Sheet ID di settings sudah benar (ambil dari URL spreadsheet)

### Anggota sudah isi form tapi tidak muncul di antrian

- Klik **Sinkronisasi dari GForm** di `/admin/members` untuk menarik data terbaru
- Pastikan email di form sama persis dengan email Google yang dipakai login
- Cek apakah ada typo di email yang diisi di form

### NIM anggota ditolak sistematis (flag merah)

- NIM harus tepat 8 digit angka
- Cek apakah ada spasi atau karakter lain yang tidak sengaja ikut masuk
- Jika NIM sudah benar tapi tetap invalid, hubungi developer

### "NIM ini sudah terdaftar" padahal belum pernah daftar

- Kemungkinan ada anggota lain yang salah ketik NIM (pakai NIM orang lain)
- Admin bisa cek di `/admin/members` siapa yang pakai NIM tersebut
- Hubungi kedua pihak untuk klarifikasi, lalu reject yang salah

---

## Bagian 12: Setup Lokal (Untuk Developer)

```bash
# Clone repo
git clone https://github.com/your-username/akademik105
cd akademik105

# Install dependencies
npm install

# Copy template env
cp .env.example .env.local

# Isi .env.local dengan credentials (lihat Bagian 6.3)
# Gunakan http://localhost:3000 untuk NEXTAUTH_URL di lokal

# Jalankan migrasi database
npm run db:migrate

# Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Catatan Keamanan

- Jangan pernah share file JSON service account ke siapapun
- Jangan commit `.env.local` ke git (sudah ada di `.gitignore`)
- Ganti `NEXTAUTH_SECRET` jika kamu curiga sudah bocor (semua sesi akan diinvalidasi)
- Link download expired dalam 1 jam — tidak bisa dipakai sebagai link permanen
- Jika ada akun Drive yang dicuriga dibobol, hapus service account key di Google Cloud Console segera dan buat yang baru

---

## Kontak & Support

Untuk masalah teknis, buka issue di repositori GitHub dengan menyertakan:
- Deskripsi masalah
- Pesan error dari browser console atau Vercel logs
- Langkah mana yang sedang dikerjakan

Untuk masalah keanggotaan (pendaftaran, akses, dll.), hubungi Divisi Akademik HMK AMISCA ITB melalui kontak yang tercantum di halaman `/waiting` aplikasi.

**Jangan pernah share credentials atau private key di issue report atau chat group.**
