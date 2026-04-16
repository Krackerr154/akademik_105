"use client";

import { Card } from "@/components/ui/Card";

export default function AuditPage() {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">LOG AUDIT</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-6">Log Audit</h1>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                        <thead>
                            <tr className="text-left text-xs text-on-surface/50 uppercase tracking-wide sticky top-0 bg-surface-container-lowest">
                                <th className="py-3 pr-4">Waktu</th>
                                <th className="py-3 pr-4">Pengguna</th>
                                <th className="py-3 pr-4">Aksi</th>
                                <th className="py-3 pr-4">Target</th>
                                <th className="py-3 hidden md:table-cell">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colSpan={5} className="py-8 text-center text-on-surface/40">Belum ada aktivitas tercatat.</td></tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
