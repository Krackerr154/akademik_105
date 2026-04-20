"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface AuditLogItem {
    id: string;
    userId: string | null;
    action: string;
    targetId: string | null;
    metadata: string | null;
    createdAt: number;
}

function formatAction(action: string): string {
    return action.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(createdAt: number): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function formatMetadata(metadata: string | null): string {
    if (!metadata) return "-";

    try {
        const parsed = JSON.parse(metadata) as unknown;
        if (parsed && typeof parsed === "object") {
            return JSON.stringify(parsed);
        }
    } catch {
        // Metadata is not valid JSON; fall back to raw string.
    }

    return metadata;
}

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/audit", { cache: "no-store" });
            const payload = (await response.json()) as { logs?: AuditLogItem[]; error?: string };

            if (!response.ok) {
                setError(payload.error ?? "Gagal memuat log audit.");
                setLogs([]);
                return;
            }

            setLogs(payload.logs ?? []);
        } catch {
            setError("Gagal menghubungi server.");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAuditLogs();
    }, [fetchAuditLogs]);

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">LOG AUDIT</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-6">Log Audit</h1>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-md text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span>{error}</span>
                    <Button variant="secondary" onClick={fetchAuditLogs}>
                        Coba Lagi
                    </Button>
                </div>
            )}

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
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-on-surface/50">
                                        Memuat log audit...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-on-surface/40">
                                        Belum ada aktivitas tercatat.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const detail = formatMetadata(log.metadata);

                                    return (
                                        <tr key={log.id} className="border-t border-surface-container-high/50">
                                            <td className="py-3 pr-4 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                                            <td className="py-3 pr-4 text-on-surface/80">{log.userId ?? "Sistem"}</td>
                                            <td className="py-3 pr-4">{formatAction(log.action)}</td>
                                            <td className="py-3 pr-4 text-on-surface/70">{log.targetId ?? "-"}</td>
                                            <td className="py-3 hidden md:table-cell text-on-surface/70 max-w-[340px] truncate" title={detail}>
                                                {detail}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
