"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function MembersPage() {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">ANTRIAN PERSETUJUAN</span></div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary mb-1">Antrian Persetujuan</h1>
                    <p className="text-sm text-on-surface/60">Pendaftaran anggota baru dari Google Form</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary">Sinkronisasi GForm</Button>
                    <Button variant="primary">Setujui Massal</Button>
                </div>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-on-surface/50 uppercase tracking-wide">
                                <th className="pb-3 pr-4">Nama</th>
                                <th className="pb-3 pr-4">Email</th>
                                <th className="pb-3 pr-4">NIM</th>
                                <th className="pb-3 pr-4">Angkatan</th>
                                <th className="pb-3 pr-4">Program</th>
                                <th className="pb-3 pr-4">Validasi</th>
                                <th className="pb-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colSpan={7} className="py-8 text-center text-on-surface/40">Belum ada pendaftaran baru. Klik &ldquo;Sinkronisasi GForm&rdquo; untuk memuat data.</td></tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
