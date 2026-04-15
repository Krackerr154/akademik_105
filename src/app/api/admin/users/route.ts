import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";

/** GET /api/admin/users — List all active users */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const allUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
}

/** POST /api/admin/users — Add a new admin (Superadmin only) */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userRole = (session.user as any).role;
    const userStatus = (session.user as any).status;

    if (userStatus !== "active" || userRole !== "superadmin") {
        return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 });
    }

    try {
        const { email } = await req.json();
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Invalid email" }, { status: 400 });
        }

        const db = getDb();
        const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const existing = existingUsers[0];

        if (existing) {
            await db
                .update(users)
                .set({ role: "admin" })
                .where(eq(users.email, email));
            return NextResponse.json({ message: "User promoted to admin", user: { ...existing, role: "admin" } });
        } else {
            const dummyUser = {
                id: crypto.randomUUID(),
                email,
                name: email.split("@")[0],
                nim: `admin-${Date.now()}`,
                angkatan: 0,
                program: "other",
                role: "admin",
                status: "active",
                createdAt: Date.now(),
            };
            await db.insert(users).values(dummyUser);
            return NextResponse.json({ message: "Admin added", user: dummyUser });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to add admin" }, { status: 500 });
    }
}
