"use client";

import { Card } from "@/components/ui/Card";

export default function UsersPage() {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">MANAJEMEN PENGGUNA</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-6">Manajemen Pengguna</h1>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-on-surface/50 uppercase tracking-wide">
                                <th className="pb-3 pr-4">Nama</th>
                                <th className="pb-3 pr-4">Email</th>
                                <th className="pb-3 pr-4">NIM</th>
                                <th className="pb-3 pr-4">Angkatan</th>
                                <th className="pb-3 pr-4">Role</th>
                                <th className="pb-3 pr-4">Status</th>
                                <th className="pb-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colSpan={7} className="py-8 text-center text-on-surface/40">Belum ada pengguna terdaftar.</td></tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
