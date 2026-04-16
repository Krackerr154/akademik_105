"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
    children: React.ReactNode;
    userRole?: string;
    userName?: string | null;
    userAvatar?: string | null;
    userRoleLabel?: string;
}

export function AppShell({
    children,
    userRole,
    userName,
    userAvatar,
    userRoleLabel,
}: AppShellProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        if (!mobileSidebarOpen) return;

        const previousOverflow = document.body.style.overflow;
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMobileSidebarOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onEsc);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onEsc);
        };
    }, [mobileSidebarOpen]);

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar
                userRole={userRole}
                mobileOpen={mobileSidebarOpen}
                onClose={() => setMobileSidebarOpen(false)}
            />

            <div className="min-h-screen md:ml-[220px]">
                <Navbar
                    userName={userName ?? undefined}
                    userAvatar={userAvatar ?? undefined}
                    userRole={userRoleLabel}
                    showMenuButton
                    onMenuClick={() => setMobileSidebarOpen(true)}
                />
                <main className="px-4 py-4 sm:px-6 sm:py-6">{children}</main>
            </div>
        </div>
    );
}
