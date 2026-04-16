import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppShell userRole="admin" userName="Admin" userRoleLabel="admin">
            {children}
        </AppShell>
    );
}
