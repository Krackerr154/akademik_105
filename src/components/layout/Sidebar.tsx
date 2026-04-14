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
    { href: "/admin", label: "Dashboard", icon: ShieldIcon, exact: true },
    { href: "/admin/members", label: "Anggota", icon: UsersIcon, exact: false },
    { href: "/admin/users", label: "Pengguna", icon: UserCogIcon, exact: false },
    { href: "/admin/drives", label: "Drive", icon: HardDriveIcon, exact: false },
    { href: "/admin/audit", label: "Audit Log", icon: ClipboardIcon, exact: false },
    { href: "/admin/types", label: "Tipe Dokumen", icon: TagIcon, exact: false },
    { href: "/admin/settings", label: "Pengaturan", icon: SettingsIcon, exact: false },
] as const;

interface SidebarProps {
    userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
    const pathname = usePathname();
    const isAdmin = userRole === "admin" || userRole === "superadmin";
    const visibleNavItems = isAdmin
        ? NAV_ITEMS
        : NAV_ITEMS.filter((item) => item.href !== "/upload");

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
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                {visibleNavItems.map((item) => {
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

                {isAdmin && (
                    <>
                        {/* Separator */}
                        <div className="pt-4 pb-2">
                            <div className="border-t border-outline-variant/20" />
                            <p className="text-[10px] text-on-surface/40 uppercase tracking-widest font-medium mt-3 px-3">
                                Admin
                            </p>
                        </div>
                        {ADMIN_ITEMS.map((item) => {
                            const isActive = item.exact
                                ? pathname === item.href
                                : pathname.startsWith(item.href);
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
                    </>
                )}
            </nav>

            {/* CTA */}
            <div className="px-3 pb-6">
                {isAdmin && (
                    <Link href="/upload">
                        <Button variant="primary" size="sm" className="w-full">
                            + Unggah Dokumen
                        </Button>
                    </Link>
                )}
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

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function UserCogIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <circle cx="19" cy="11" r="2" />
            <path d="M19 8v1M19 13v1M21.5 9.5l-.87.5M16.5 12.5l-.87.5M21.5 12.5l-.87-.5M16.5 9.5l-.87-.5" />
        </svg>
    );
}

function HardDriveIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="12" x2="2" y2="12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            <line x1="6" y1="16" x2="6.01" y2="16" />
            <line x1="10" y1="16" x2="10.01" y2="16" />
        </svg>
    );
}

function ClipboardIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
    );
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function TagIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83z" />
            <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
    );
}

