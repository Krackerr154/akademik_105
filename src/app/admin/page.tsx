import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function AdminDashboardPage() {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">DASHBOARD</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-6">Panel Admin</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard label="Total Anggota" value="–" sublabel="pengguna aktif" />
                <StatCard label="Pendaftar Baru" value="–" sublabel="menunggu persetujuan" badge="flag-yellow" />
                <StatCard label="Total Arsip" value="–" sublabel="dokumen terarsip" />
                <StatCard label="Penyimpanan" value="–" sublabel="dari 30 GB total" />
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
