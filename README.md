# Akademik 105

Akademik 105 is an academic repository app for HMK AMISCA ITB.

It provides member management, role-based access, file browsing/search, and controlled metadata for uploaded documents.

## Core Features

- Google OAuth login with status flow (`pending`, `active`, `rejected`, `suspended`)
- Admin approval pipeline from Google Form + Google Sheets sync
- Academic file repository with browse, search, preview, and download
- Controlled document type taxonomy (`doc_type`) with admin-managed custom types
- Resumable upload to Google Drive with DB metadata write and audit log

## Upload Access Policy

Upload is restricted to **admin** and **superadmin** only.

- UI navigation hides upload entry points for non-admin users
- Page route `/upload` is blocked for non-admin users
- API routes `/api/upload/init` and `/api/upload/complete` return `403` for non-admin users

Role summary:

- `user`: browse, search, download, edit own metadata (if owner), **cannot upload**
- `admin`: all user capabilities + upload + admin tools
- `superadmin`: all admin capabilities + superadmin-only settings

## Managed Document Types

Files use a controlled `doc_type` field instead of free-form primary tag classification.

Default types:

- `[SLIDE]`
- `[UJIAN 1]`
- `[UJIAN 2]`
- `[UJIAN 3]`
- `[LATIHAN]`
- `[SOLUSI]`
- `[TEXTBOOK]`
- `[SPEKTRA]`
- `[KERATIN]`
- `[OTHER]`

Admins and superadmins can add custom types from the admin type manager.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Drizzle ORM + Turso (libsql)
- NextAuth v5 beta
- Tailwind CSS
- Google Drive API + Google Sheets API integration

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (`.env.local`).

3. Run database migration:

```bash
npm run db:migrate
```

4. Start development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build production app
- `npm run start` - Run production server
- `npm run lint` - Run lint checks
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Apply migrations
- `npm run db:studio` - Open Drizzle Studio

## Important Paths

- `src/app/(member)` - Member-facing pages
- `src/app/admin` - Admin pages
- `src/app/api` - API routes
- `src/db` - Drizzle schema and migrations
- `src/lib/drive` - Drive adapter and routing

## Full Setup Guide

For full production setup (Google OAuth, Drive A/B, Sheets sync, Turso, Vercel), read:

- `INSTRUCTIONS.md`
