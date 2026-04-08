"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
    { href: "/", label: "Jelajahi", icon: BookIcon },
    { href: "/search", label: "Pencarian", icon: SearchIcon },
    { href: "/upload", label: "Unggah", icon: UploadIcon },
] as const;

const ADMIN_ITEMS = [
    { href: "/admin", label: "Admin", icon: ShieldIcon },
] as const;

interface SidebarProps {
    userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
    const pathname = usePathname();
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface-container-low flex flex-col z-40">
            {/* Logo */}
            <div className="px-5 pt-6 pb-4">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md gradient-cta flex items-center justify-center">
                        <span className="text-on-secondary font-display font-bold text-sm">
                            A
                        </span>
                    </div>
                    <div>
                        <p className="font-display font-bold text-sm text-primary leading-tight">
                            Akademik 105
                        </p>
                        <p className="text-[10px] text-on-surface/50 uppercase tracking-wider">
                            AMISCA ITB
                        </p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                isActive
                                    ? "text-secondary bg-secondary/8"
                                    : "text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high/50"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "w-4 h-4",
                                    isActive ? "text-secondary" : "text-on-surface/50"
                                )}
                            />
                            {item.label}
                        </Link>
                    );
                })}

                {isAdmin &&
                    ADMIN_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                                    isActive
                                        ? "text-secondary bg-secondary/8"
                                        : "text-on-surface/70 hover:text-on-surface hover:bg-surface-container-high/50"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-4 h-4",
                                        isActive ? "text-secondary" : "text-on-surface/50"
                                    )}
                                />
                                {item.label}
                            </Link>
                        );
                    })}
            </nav>

            {/* CTA */}
            <div className="px-3 pb-6">
                <Link href="/upload">
                    <Button variant="primary" size="sm" className="w-full">
                        + Unggah Dokumen
                    </Button>
                </Link>
            </div>
        </aside>
    );
}

// ─── Inline SVG Icons (no external deps) ───────────────────────────────

function BookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function UploadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
    );
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}
