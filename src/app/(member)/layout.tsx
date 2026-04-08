import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default function MemberLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-surface">
            <Sidebar />
            <div className="ml-[220px]">
                <Navbar />
                <main className="px-6 py-6">{children}</main>
            </div>
        </div>
    );
}
