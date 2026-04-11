"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PendingMember {
    id: string;
    email: string;
    fullName: string;
    nim: string;
    angkatan: number;
    program: string;
    whatsapp: string;
    submittedAt: number;
    approvalStatus: string;
    nimFormatValid: number;
    nimScopeFlag: number;
    nimYearFlag: number;
    nimDuplicate: number;
}

function NimFlagBadge({ member }: { member: PendingMember }) {
    // Hard block: format invalid or duplicate
    if (!member.nimFormatValid || member.nimDuplicate) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                🔴 {!member.nimFormatValid ? "Format Invalid" : "NIM Duplikat"}
            </span>
        );
    }

    // Soft flags: scope or year mismatch
    if (member.nimScopeFlag || member.nimYearFlag) {
        const flags: string[] = [];
        if (member.nimScopeFlag) flags.push("Prodi Luar");
        if (member.nimYearFlag) flags.push("Tahun Tidak Cocok");
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                🟡 {flags.join(", ")}
            </span>
        );
    }

    // No flags — all good
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            🟢 Valid
        </span>
    );
}

export default function MembersPage() {
    const [members, setMembers] = useState<PendingMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [bulkApproving, setBulkApproving] = useState(false);
    const [actionStates, setActionStates] = useState<Record<string, boolean>>({});
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/members");
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members ?? []);
            }
        } catch (err) {
            console.error("Gagal memuat data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleSync = async () => {
        setSyncing(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/members/sync", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setMessage({
                    text: `Sinkronisasi selesai. ${data.added ?? 0} ditambahkan, ${data.skipped ?? 0} dilewati.`,
                    type: "success",
                });
                fetchMembers();
            } else {
                setMessage({ text: data.error ?? "Gagal sinkronisasi", type: "error" });
            }
        } catch {
            setMessage({ text: "Gagal menghubungi server", type: "error" });
        } finally {
            setSyncing(false);
        }
    };

    const handleBulkApprove = async () => {
        const angkatan = prompt("Masukkan angkatan untuk disetujui massal (contoh: 2024):");
        if (!angkatan) return;

        setBulkApproving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/members/bulk-approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ angkatan: parseInt(angkatan) }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({
                    text: `${data.approved ?? 0} anggota disetujui untuk angkatan ${angkatan}.`,
                    type: "success",
                });
                fetchMembers();
            } else {
                setMessage({ text: data.error ?? "Gagal menyetujui massal", type: "error" });
            }
        } catch {
            setMessage({ text: "Gagal menghubungi server", type: "error" });
        } finally {
            setBulkApproving(false);
        }
    };

    const handleAction = async (memberId: string, action: "approve" | "reject") => {
        const rejectionReason = action === "reject"
            ? prompt("Alasan penolakan:")
            : undefined;
        if (action === "reject" && !rejectionReason) return;

        setActionStates((prev) => ({ ...prev, [memberId]: true }));
        try {
            const res = await fetch(`/api/admin/members/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    approvalStatus: action === "approve" ? "approved" : "rejected",
                    ...(rejectionReason && { rejectionReason }),
                }),
            });
            if (res.ok) {
                fetchMembers();
            }
        } catch {
            setMessage({ text: "Gagal memproses", type: "error" });
        } finally {
            setActionStates((prev) => ({ ...prev, [memberId]: false }));
        }
    };

    const pendingMembers = members.filter((m) => m.approvalStatus === "pending");

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ADMIN</span><span>›</span>
                <span className="text-on-surface/70">ANTRIAN PERSETUJUAN</span>
            </div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary mb-1">Antrian Persetujuan</h1>
                    <p className="text-sm text-on-surface/60">
                        Pendaftaran anggota baru dari Google Form ({pendingMembers.length} pending)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? "Sinkronisasi..." : "Sinkronisasi GForm"}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleBulkApprove}
                        disabled={bulkApproving}
                    >
                        {bulkApproving ? "Memproses..." : "Setujui Massal"}
                    </Button>
                </div>
            </div>

            {/* Status message */}
            {message && (
                <div className={`mb-4 px-4 py-3 rounded-md text-sm ${message.type === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                    {message.text}
                </div>
            )}

            <Card>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : (
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
                                {pendingMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-on-surface/40">
                                            Belum ada pendaftaran baru. Klik &ldquo;Sinkronisasi GForm&rdquo; untuk memuat data.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingMembers.map((m) => {
                                        const hasHardBlock = !m.nimFormatValid || m.nimDuplicate === 1;
                                        const isProcessing = actionStates[m.id] ?? false;

                                        return (
                                            <tr key={m.id} className="border-t border-surface-container-high/50">
                                                <td className="py-3 pr-4 font-medium">{m.fullName}</td>
                                                <td className="py-3 pr-4 text-on-surface/70">{m.email}</td>
                                                <td className="py-3 pr-4 font-mono text-xs">{m.nim}</td>
                                                <td className="py-3 pr-4">{m.angkatan}</td>
                                                <td className="py-3 pr-4 capitalize">{m.program}</td>
                                                <td className="py-3 pr-4">
                                                    <NimFlagBadge member={m} />
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleAction(m.id, "approve")}
                                                            disabled={hasHardBlock || isProcessing}
                                                            className="px-3 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            title={hasHardBlock ? "Tidak dapat disetujui — NIM tidak valid" : "Setujui"}
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(m.id, "reject")}
                                                            disabled={isProcessing}
                                                            className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
}
