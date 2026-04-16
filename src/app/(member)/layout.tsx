import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";

export default async function MemberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const user = session?.user as
        | { role?: string; name?: string | null; image?: string | null }
        | undefined;

    return (
        <AppShell
            userRole={user?.role}
            userName={user?.name ?? null}
            userAvatar={user?.image ?? null}
            userRoleLabel={user?.role}
        >
            {children}
        </AppShell>
    );
}
