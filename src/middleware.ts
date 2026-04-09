import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
    "/register",
    "/waiting",
    "/rejected",
    "/suspended",
    "/auth",
    "/api/auth",
];

// Routes requiring admin+ role
const ADMIN_ROUTES = ["/admin", "/api/admin"];

// Routes requiring superadmin only
const SUPERADMIN_ROUTES = ["/admin/settings", "/api/admin/settings"];

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const session = req.auth;

    // Allow public routes
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow static assets and Next.js internals
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // No session → redirect to sign in
    if (!session?.user) {
        const signInUrl = new URL("/api/auth/signin", req.url);
        signInUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(signInUrl);
    }

    const user = session.user as Record<string, string | undefined>;
    const userRole = user.role ?? "";
    const userStatus = user.status ?? "";

    // ─── Status gate (rules.md §3.1) ─────────────────────────────
    if (userStatus === "suspended") {
        return NextResponse.redirect(new URL("/suspended", req.url));
    }

    if (userStatus === "pending") {
        if (pathname !== "/waiting") {
            return NextResponse.redirect(new URL("/waiting", req.url));
        }
        return NextResponse.next();
    }

    if (userStatus === "rejected") {
        if (pathname !== "/rejected") {
            return NextResponse.redirect(new URL("/rejected", req.url));
        }
        return NextResponse.next();
    }

    if (userStatus !== "active") {
        return NextResponse.redirect(new URL("/register", req.url));
    }

    // ─── Role gate ────────────────────────────────────────────────
    const ROLE_WEIGHT: Record<string, number> = {
        superadmin: 3,
        admin: 2,
        user: 1,
    };

    const userWeight = ROLE_WEIGHT[userRole] ?? 0;

    // Superadmin-only routes
    if (SUPERADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
        if (userWeight < ROLE_WEIGHT.superadmin) {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    // Admin routes
    if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
        if (userWeight < ROLE_WEIGHT.admin) {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
