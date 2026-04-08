import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-surface">
            <Sidebar userRole="admin" />
            <div className="ml-[220px]">
                <Navbar />
                <main className="px-6 py-6">{children}</main>
            </div>
        </div>
    );
}
