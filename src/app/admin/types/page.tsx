"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDocumentTypeLabel, normalizeDocumentTypeCode } from "@/types";

type AdminDocumentType = {
    id: string;
    code: string;
    label: string;
    isSystem: boolean;
    isActive: boolean;
    sortOrder: number;
};

export default function AdminTypesPage() {
    const [types, setTypes] = useState<AdminDocumentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const [newCode, setNewCode] = useState("");
    const [newLabel, setNewLabel] = useState("");

    const fetchTypes = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/document-types");
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Gagal memuat tipe dokumen");
            }

            const data = await res.json();
            const mapped = Array.isArray(data.types)
                ? data.types.map((t: Record<string, unknown>) => ({
                      id: String(t.id),
                      code: String(t.code),
                      label: String(t.label),
                      isSystem: t.isSystem === 1 || t.isSystem === true,
                      isActive: t.isActive === 1 || t.isActive === true,
                      sortOrder: Number(t.sortOrder ?? 0),
                  }))
                : [];

            setTypes(mapped);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTypes();
    }, [fetchTypes]);

    const sortedTypes = useMemo(
        () => [...types].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
        [types]
    );

    const handleCreate = async () => {
        const code = normalizeDocumentTypeCode(newCode || newLabel);
        const label = newLabel.trim() || formatDocumentTypeLabel(code);

        if (!code) {
            setError("Isi kode atau label tipe dokumen terlebih dahulu.");
            return;
        }

        setError("");
        setBusyId("new");

        try {
            const res = await fetch("/api/admin/document-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, label }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Gagal menambah tipe dokumen");
            }

            setNewCode("");
            setNewLabel("");
            await fetchTypes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveRow = async (typeId: string, label: string, sortOrder: number) => {
        setError("");
        setBusyId(typeId);

        try {
            const res = await fetch("/api/admin/document-types", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: typeId, label: label.trim(), sortOrder }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Gagal menyimpan perubahan");
            }

            await fetchTypes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleActive = async (typeId: string, nextActive: boolean) => {
        setError("");
        setBusyId(typeId);

        try {
            const res = await fetch("/api/admin/document-types", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: typeId, isActive: nextActive }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Gagal memperbarui status tipe");
            }

            await fetchTypes();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ADMIN</span><span>›</span><span className="text-on-surface/70">MANAJEMEN TIPE DOKUMEN</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Tipe Dokumen</h1>
            <p className="text-sm text-on-surface/60 mb-6 max-w-2xl">
                Kelola daftar tipe dokumen terkontrol untuk proses upload dan edit metadata.
                Tipe baru akan langsung tersedia untuk seluruh pengguna.
            </p>

            {error && (
                <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <Card className="xl:col-span-1">
                    <h2 className="text-lg font-display font-semibold text-primary mb-4">Tambah Tipe Baru</h2>
                    <div className="space-y-4">
                        <Input
                            id="new-type-code"
                            label="KODE"
                            placeholder="CONTOH: RANGKUMAN"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                        />
                        <Input
                            id="new-type-label"
                            label="LABEL TAMPILAN"
                            placeholder="Contoh: [RANGKUMAN]"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                        />
                        <Button
                            className="w-full"
                            onClick={handleCreate}
                            disabled={busyId === "new"}
                        >
                            {busyId === "new" ? "Menyimpan..." : "Tambah Tipe"}
                        </Button>
                    </div>
                </Card>

                <div className="xl:col-span-2 space-y-4">
                    {loading ? (
                        <Card>
                            <p className="text-sm text-on-surface/60">Memuat tipe dokumen...</p>
                        </Card>
                    ) : (
                        sortedTypes.map((row) => (
                            <TypeRowCard
                                key={row.id}
                                row={row}
                                busy={busyId === row.id}
                                onSave={handleSaveRow}
                                onToggleActive={handleToggleActive}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function TypeRowCard({
    row,
    busy,
    onSave,
    onToggleActive,
}: {
    row: AdminDocumentType;
    busy: boolean;
    onSave: (typeId: string, label: string, sortOrder: number) => Promise<void>;
    onToggleActive: (typeId: string, nextActive: boolean) => Promise<void>;
}) {
    const [label, setLabel] = useState(row.label);
    const [sortOrder, setSortOrder] = useState(String(row.sortOrder));

    useEffect(() => {
        setLabel(row.label);
        setSortOrder(String(row.sortOrder));
    }, [row.id, row.label, row.sortOrder]);

    return (
        <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="data">{row.code}</Badge>
                    <Badge variant={row.isActive ? "flag-green" : "flag-yellow"}>
                        {row.isActive ? "Aktif" : "Diarsipkan"}
                    </Badge>
                    <Badge variant={row.isSystem ? "default" : "subject"}>
                        {row.isSystem ? "System" : "Custom"}
                    </Badge>
                </div>
                <div className="text-xs text-on-surface/50">
                    {formatDocumentTypeLabel(row.code)}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                    <Input
                        id={`label-${row.id}`}
                        label="LABEL"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                    />
                </div>
                <Input
                    id={`sort-${row.id}`}
                    label="URUTAN"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                />
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
                <Button
                    variant="secondary"
                    disabled={busy || row.isSystem}
                    onClick={() => onToggleActive(row.id, !row.isActive)}
                    title={row.isSystem ? "Tipe bawaan sistem tidak dapat diarsipkan" : ""}
                >
                    {row.isActive ? "Arsipkan" : "Aktifkan"}
                </Button>
                <Button
                    disabled={busy}
                    onClick={() => onSave(row.id, label, Number(sortOrder || 0))}
                >
                    {busy ? "Menyimpan..." : "Simpan"}
                </Button>
            </div>
        </Card>
    );
}
