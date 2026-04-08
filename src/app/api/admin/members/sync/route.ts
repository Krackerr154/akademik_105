import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasMinRole } from "@/types";
import { syncGFormResponses } from "@/lib/sheets/sync";

/** POST /api/admin/members/sync — Sync GForm responses */
export async function POST() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user as { id?: string; role?: string; status?: string };
    if (user.status !== "active" || !hasMinRole(user.role ?? "", "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await syncGFormResponses(user.id ?? "");
    return NextResponse.json(result);
}
