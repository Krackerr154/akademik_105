"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DrivesPage() {
    type DriveStatus = "OPTIMAL" | "STABLE" | "CRITICAL";
    const drives: { id: string; label: string; sublabel: string; usage: number; total: number; status: DriveStatus }[] = [
        { id: "A", label: "Drive A", sublabel: "Arsip Utama", usage: 0, total: 15, status: "OPTIMAL" },
        { id: "B", label: "Drive B", sublabel: "Arsip Cadangan", usage: 0, total: 15, status: "OPTIMAL" },
    ];

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ADMIN</span>
                <span>›</span>
                <span>INFRASTRUKTUR SISTEM</span>
                <span>›</span>
                <span className="text-on-surface/70">DRIVE USAGE</span>
            </div>

            <h1 className="text-3xl font-display font-bold text-primary mb-6">
                Administrasi Sistem — Penggunaan Drive
            </h1>

            {/* Drive cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
                {drives.map((drive) => {
                    const pct = drive.total > 0 ? Math.round((drive.usage / drive.total) * 100) : 0;
                    const statusColor =
                        drive.status === "CRITICAL"
                            ? "flag-red"
                            : drive.status === "OPTIMAL"
                                ? "flag-green"
                                : "default";

                    return (
                        <Card key={drive.id}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-display font-semibold text-primary">
                                        {drive.label}
                                    </h3>
                                    <p className="text-xs text-on-surface/50">{drive.sublabel}</p>
                                </div>
                                <Badge variant={statusColor}>{drive.status}</Badge>
                            </div>

                            {/* Circular gauge */}
                            <div className="flex justify-center mb-4">
                                <DriveGauge percentage={pct} />
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <div>
                                    <p className="text-on-surface/50 uppercase">Penggunaan</p>
                                    <p className="font-mono text-on-surface">
                                        {drive.usage.toFixed(1)} GB / {drive.total} GB
                                    </p>
                                </div>
                                <div>
                                    <p className="text-on-surface/50 uppercase">Jumlah File</p>
                                    <p className="font-mono text-on-surface">–</p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Recent activity */}
            <h2 className="text-lg font-display font-semibold text-primary mb-3">
                Aktivitas Arsip Terkini
            </h2>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-on-surface/50 uppercase tracking-wide">
                                <th className="pb-3 pr-4">Nama File</th>
                                <th className="pb-3 pr-4">Aksi</th>
                                <th className="pb-3 pr-4">Pengguna</th>
                                <th className="pb-3 pr-4">Drive</th>
                                <th className="pb-3">Waktu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-on-surface/40">
                                    Belum ada aktivitas terbaru.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function DriveGauge({ percentage }: { percentage: number }) {
    const radius = 50;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const color =
        percentage >= 80
            ? "#ba1a1a"
            : percentage >= 50
                ? "#ffb77d"
                : "#086b5b";

    return (
        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
            <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#e3e2e0"
                strokeWidth={strokeWidth}
            />
            <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
            <text
                x="60"
                y="60"
                textAnchor="middle"
                dominantBaseline="central"
                className="transform rotate-90 origin-center"
                fill="#091526"
                fontSize="20"
                fontFamily="Manrope"
                fontWeight="700"
            >
                {percentage}%
            </text>
        </svg>
    );
}
