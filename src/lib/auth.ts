import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/lib/db";
import { users, pendingRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionUser } from "@/types";
import { formatNimMasked } from "@/lib/utils";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
    },
    callbacks: {
        /**
         * signIn callback — Full lifecycle per rules.md §3.4
         * Priority order:
         * 1. Email in users + active → allow
         * 2. Email in users + suspended → deny
         * 3. Email in pending_registrations + approved → create user + allow
         * 4. Email in pending_registrations + pending → allow (status=pending)
         * 5. Email in pending_registrations + rejected → allow (status=rejected)
         * 6. Email not found → redirect to /register
         */
        async signIn({ user }) {
            if (!user.email) return false;
            const db = getDb();

            // ─── Superadmin Bootstrap ─────────────────────────────────
            const superadminEmails = (process.env.SUPERADMIN_EMAILS ?? "")
                .split(",")
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean);

            if (superadminEmails.includes(user.email.toLowerCase())) {
                const existing = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, user.email))
                    .limit(1);

                if (existing.length === 0) {
                    await db.insert(users).values({
                        id: crypto.randomUUID(),
                        email: user.email,
                        name: user.name ?? "Superadmin",
                        avatarUrl: user.image ?? null,
                        nim: "00000000",
                        angkatan: 0,
                        program: "kimia",
                        role: "superadmin",
                        status: "active",
                        createdAt: Date.now(),
                    });
                }
                return true;
            }

            // ─── Step 1 & 2: Check users table ────────────────────────
            const existingUser = await db
                .select()
                .from(users)
                .where(eq(users.email, user.email))
                .limit(1);

            if (existingUser.length > 0) {
                const u = existingUser[0];
                if (u.status === "active") {
                    // Step 1: active user → allow
                    await db
                        .update(users)
                        .set({ lastSeen: Date.now(), avatarUrl: user.image ?? u.avatarUrl })
                        .where(eq(users.id, u.id));
                    return true;
                }
                if (u.status === "suspended") {
                    // Step 2: suspended → deny
                    return "/suspended";
                }
            }

            // ─── Step 3–5: Check pending_registrations ────────────────
            const pending = await db
                .select()
                .from(pendingRegistrations)
                .where(eq(pendingRegistrations.email, user.email))
                .limit(1);

            if (pending.length > 0) {
                const p = pending[0];

                if (p.approvalStatus === "approved") {
                    // Step 3: approved → create user record
                    await db.insert(users).values({
                        id: crypto.randomUUID(),
                        email: user.email,
                        name: p.fullName,
                        avatarUrl: user.image ?? null,
                        nim: p.nim,
                        angkatan: p.angkatan,
                        whatsapp: p.whatsapp,
                        program: p.program,
                        role: "user",
                        status: "active",
                        approvedBy: p.reviewedBy,
                        approvedAt: p.reviewedAt,
                        createdAt: Date.now(),
                    });
                    return true;
                }

                if (p.approvalStatus === "pending") {
                    // Step 4: pending → allow but redirect to waiting
                    return "/waiting";
                }

                if (p.approvalStatus === "rejected") {
                    // Step 5: rejected → redirect to rejected
                    return "/rejected";
                }
            }

            // ─── Step 6: Not found → redirect to register ────────────
            return "/register";
        },

        async session({ session, token }) {
            if (token.sub) {
                const db = getDb();
                const userRecord = await db
                    .select()
                    .from(users)
                    .where(eq(users.email, session.user.email ?? ""))
                    .limit(1);

                if (userRecord.length > 0) {
                    const u = userRecord[0];
                    const sessionUser: SessionUser = {
                        id: u.id,
                        email: u.email,
                        name: u.name,
                        image: u.avatarUrl ?? undefined,
                        role: u.role as SessionUser["role"],
                        status: u.status as SessionUser["status"],
                        nim: formatNimMasked(u.nim),
                        angkatan: u.angkatan,
                    };
                    session.user = sessionUser as typeof session.user & SessionUser;
                }
            }
            return session;
        },

        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
            }
            return token;
        },
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
});
