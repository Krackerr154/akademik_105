import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { users, pendingRegistrations, files } from "@/db/schema";
import { eq, sum, count } from "drizzle-orm";

export default async function AdminDashboardPage() {
    const db = getDb();

    // 1. Total Anggota (users where status='active')
    const activeUsersRes = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.status, "active"));
    const totalAnggota = activeUsersRes[0].count;

    // 2. Pendaftar Baru (pendingRegistrations where approvalStatus='pending')
    const pendingRes = await db
        .select({ count: count() })
        .from(pendingRegistrations)
        .where(eq(pendingRegistrations.approvalStatus, "pending"));
    const pendaftarBaru = pendingRes[0].count;

    // 3. Total Arsip (count from files)
    const filesCountRes = await db.select({ count: count() }).from(files);
    const totalArsip = filesCountRes[0].count;

    // 4. Penyimpanan (sum sizeBytes from files)
    const storageRes = await db.select({ totalSize: sum(files.sizeBytes) }).from(files);
    const bytes = Number(storageRes[0].totalSize || 0);
    const gb = bytes / (1024 * 1024 * 1024);
    const storageText = bytes > 0 && gb < 0.01 ? "< 0.01 GB" : `${gb.toFixed(2)} GB`;

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">DASHBOARD</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-6">Panel Admin</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard label="Total Anggota" value={totalAnggota.toString()} sublabel="pengguna aktif" />
                <StatCard label="Pendaftar Baru" value={pendaftarBaru.toString()} sublabel="menunggu persetujuan" badge="flag-yellow" />
                <StatCard label="Total Arsip" value={totalArsip.toString()} sublabel="dokumen terarsip" />
                <StatCard label="Penyimpanan" value={storageText} sublabel="dari 30 GB total" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Link href="/admin/members">
                    <Card hover><h3 className="font-display font-semibold text-primary mb-1">Antrian Persetujuan</h3><p className="text-sm text-on-surface/60">Kelola pendaftaran anggota baru dan lakukan sinkronisasi GForm.</p></Card>
                </Link>
                <Link href="/admin/users">
                    <Card hover><h3 className="font-display font-semibold text-primary mb-1">Manajemen Pengguna</h3><p className="text-sm text-on-surface/60">Lihat dan kelola anggota aktif, ubah peran, atau tangguhkan akun.</p></Card>
                </Link>
                <Link href="/admin/drives">
                    <Card hover><h3 className="font-display font-semibold text-primary mb-1">Penggunaan Drive</h3><p className="text-sm text-on-surface/60">Pantau kapasitas penyimpanan Google Drive A & B.</p></Card>
                </Link>
                <Link href="/admin/audit">
                    <Card hover><h3 className="font-display font-semibold text-primary mb-1">Log Audit</h3><p className="text-sm text-on-surface/60">Lihat riwayat aktivitas sistem: upload, download, approve, dll.</p></Card>
                </Link>
            </div>
        </div>
    );
}

function StatCard(
    { label, value, sublabel, badge }: { label: string; value: string; sublabel: string; badge?: string }
) {
    return (
        <Card>
            <p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display font-bold text-primary">{value}</p>
                {badge && <Badge variant={badge as "flag-yellow"}>{sublabel}</Badge>}
            </div>
            {!badge && <p className="text-xs text-on-surface/50 mt-0.5">{sublabel}</p>}
        </Card>
    );
}
