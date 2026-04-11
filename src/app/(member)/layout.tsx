import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { auth } from "@/lib/auth";

export default async function MemberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const user = session?.user as { role?: string } | undefined;

    return (
        <div className="min-h-screen bg-surface">
            <Sidebar userRole={user?.role} />
            <div className="ml-[220px]">
                <Navbar />
                <main className="px-6 py-6">{children}</main>
            </div>
        </div>
    );
}
