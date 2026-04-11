"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DriveInfo {
    driveId: string;
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    updatedAt: number;
    status: "ok" | "error";
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatGb(bytes: number): string {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getHealthStatus(drive: DriveInfo): { label: string; variant: string; color: string } {
    if (drive.status === "error") return { label: "TIDAK TERSEDIA", variant: "flag-red", color: "#ba1a1a" };
    const pct = drive.totalBytes > 0 ? (drive.usedBytes / drive.totalBytes) * 100 : 0;
    if (pct >= 90) return { label: "KRITIS", variant: "flag-red", color: "#ba1a1a" };
    if (pct >= 70) return { label: "WASPADA", variant: "flag-yellow", color: "#ffb77d" };
    return { label: "OPTIMAL", variant: "flag-green", color: "#086b5b" };
}

function timeAgo(ts: number): string {
    if (!ts) return "Belum pernah";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return `${Math.floor(hours / 24)} hari lalu`;
}

export default function DrivesPage() {
    const [drives, setDrives] = useState<DriveInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchDrives = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/drives");
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? `HTTP ${res.status}`);
            }
            const data = await res.json();
            setDrives(data.drives ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal memuat data drive");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDrives();
    }, [fetchDrives]);

    // Totals
    const totalUsed = drives.reduce((sum, d) => sum + d.usedBytes, 0);
    const totalCapacity = drives.reduce((sum, d) => sum + d.totalBytes, 0);
    const totalFree = totalCapacity - totalUsed;
    const overallPct = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;
    const healthyDrives = drives.filter((d) => d.status === "ok").length;

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ADMIN</span><span>›</span>
                <span>INFRASTRUKTUR</span><span>›</span>
                <span className="text-on-surface/70">DRIVE USAGE</span>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary mb-1">
                        Monitoring Drive
                    </h1>
                    <p className="text-sm text-on-surface/60">
                        Kapasitas, kesehatan, dan status Google Drive backend
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => fetchDrives(true)}
                    disabled={refreshing}
                >
                    {refreshing ? "Memuat ulang..." : "Refresh Data"}
                </Button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 px-4 py-3 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <SummaryCard label="Total Kapasitas" value={formatGb(totalCapacity)} icon="💾" />
                        <SummaryCard label="Terpakai" value={formatGb(totalUsed)} sublabel={`${overallPct}%`} icon="📊" />
                        <SummaryCard label="Tersedia" value={formatGb(totalFree)} icon="✅" />
                        <SummaryCard label="Drive Aktif" value={`${healthyDrives} / ${drives.length}`} icon="🖥️" />
                    </div>

                    {/* Overall usage bar */}
                    <Card className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-on-surface">Total Penggunaan Seluruh Drive</p>
                            <span className="text-sm font-mono text-on-surface/60">{overallPct}%</span>
                        </div>
                        <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${overallPct}%`,
                                    backgroundColor: overallPct >= 90 ? "#ba1a1a" : overallPct >= 70 ? "#ffb77d" : "#086b5b",
                                }}
                            />
                        </div>
                        <p className="text-xs text-on-surface/40 mt-2">
                            {formatGb(totalUsed)} dari {formatGb(totalCapacity)} terpakai
                        </p>
                    </Card>

                    {/* Per-Drive cards */}
                    <h2 className="text-lg font-display font-semibold text-primary mb-4">
                        Detail Per-Drive
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
                        {drives.map((drive) => {
                            const pct = drive.totalBytes > 0 ? Math.round((drive.usedBytes / drive.totalBytes) * 100) : 0;
                            const health = getHealthStatus(drive);

                            return (
                                <Card key={drive.driveId}>
                                    <div className="flex items-start justify-between mb-5">
                                        <div>
                                            <h3 className="font-display font-semibold text-primary text-lg">
                                                Drive {drive.driveId}
                                            </h3>
                                            <p className="text-xs text-on-surface/50">
                                                {drive.driveId === "A" ? "Arsip Utama" : "Arsip Cadangan"}
                                            </p>
                                        </div>
                                        <Badge variant={health.variant as "flag-red" | "flag-green" | "flag-yellow" | "default"}>
                                            {health.label}
                                        </Badge>
                                    </div>

                                    {/* Circular gauge */}
                                    <div className="flex justify-center mb-5">
                                        <DriveGauge percentage={pct} color={health.color} />
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <p className="text-on-surface/50 uppercase mb-0.5">Terpakai</p>
                                            <p className="font-mono text-on-surface font-medium">{formatBytes(drive.usedBytes)}</p>
                                        </div>
                                        <div>
                                            <p className="text-on-surface/50 uppercase mb-0.5">Kapasitas</p>
                                            <p className="font-mono text-on-surface font-medium">{formatGb(drive.totalBytes)}</p>
                                        </div>
                                        <div>
                                            <p className="text-on-surface/50 uppercase mb-0.5">Tersedia</p>
                                            <p className="font-mono text-on-surface font-medium">{formatBytes(drive.freeBytes)}</p>
                                        </div>
                                        <div>
                                            <p className="text-on-surface/50 uppercase mb-0.5">Terakhir Diperbarui</p>
                                            <p className="font-mono text-on-surface font-medium">{timeAgo(drive.updatedAt)}</p>
                                        </div>
                                    </div>

                                    {/* Usage bar */}
                                    <div className="mt-4">
                                        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: health.color }}
                                            />
                                        </div>
                                    </div>

                                    {/* Warning for error state */}
                                    {drive.status === "error" && (
                                        <div className="mt-4 px-3 py-2 rounded-md bg-red-100/50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                                            Tidak dapat terhubung ke Drive ini. Periksa konfigurasi Service Account
                                            (GDRIVE_{drive.driveId}_CLIENT_EMAIL, GDRIVE_{drive.driveId}_PRIVATE_KEY, GDRIVE_{drive.driveId}_FOLDER_ID).
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>

                    {/* Diagnostic info */}
                    <h2 className="text-lg font-display font-semibold text-primary mb-4">
                        Diagnostik
                    </h2>
                    <Card>
                        <div className="space-y-3 text-xs font-mono">
                            <div className="flex justify-between">
                                <span className="text-on-surface/50">Total Drive Dikonfigurasi</span>
                                <span className="text-on-surface">{drives.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-on-surface/50">Drive Aktif (API OK)</span>
                                <span className={healthyDrives === drives.length ? "text-emerald-600" : "text-red-500"}>
                                    {healthyDrives} / {drives.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-on-surface/50">Min. Sisa untuk Upload</span>
                                <span className="text-on-surface">100 MB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-on-surface/50">Cache TTL</span>
                                <span className="text-on-surface">30 menit</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-on-surface/50">Load Balancing</span>
                                <span className="text-on-surface">Most Free Space First</span>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, sublabel, icon }: { label: string; value: string; sublabel?: string; icon: string }) {
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-xl font-display font-bold text-on-surface">{value}</p>
                    {sublabel && <p className="text-xs text-on-surface/50 mt-0.5">{sublabel}</p>}
                </div>
                <span className="text-2xl">{icon}</span>
            </div>
        </Card>
    );
}

function DriveGauge({ percentage, color }: { percentage: number; color: string }) {
    const radius = 50;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
            <circle
                cx="60" cy="60" r={radius}
                fill="none" stroke="#e3e2e0" strokeWidth={strokeWidth}
            />
            <circle
                cx="60" cy="60" r={radius}
                fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
            <text
                x="60" y="60"
                textAnchor="middle" dominantBaseline="central"
                className="transform rotate-90 origin-center"
                fill="#091526" fontSize="20" fontFamily="Manrope" fontWeight="700"
            >
                {percentage}%
            </text>
        </svg>
    );
}
