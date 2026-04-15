"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { KELOMPOK_CARD_STYLE, normalizeKelompokCode } from "@/types";

type AdminKelompokCard = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    cardStyle: "rect" | "drive";
    isSystem: boolean;
    isActive: boolean;
    sortOrder: number;
};

type SubjectMapping = {
    id: string;
    subjectKey: string;
    subjectLabel: string;
    kelompokCode: string;
};

type UnmappedSubject = {
    subjectKey: string;
    subjectLabel: string;
};

export default function AdminKelompokPage() {
    const [cards, setCards] = useState<AdminKelompokCard[]>([]);
    const [mappings, setMappings] = useState<SubjectMapping[]>([]);
    const [unmappedSubjects, setUnmappedSubjects] = useState<UnmappedSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    const [newCardCode, setNewCardCode] = useState("");
    const [newCardName, setNewCardName] = useState("");
    const [newCardDescription, setNewCardDescription] = useState("");
    const [newCardPhotoUrl, setNewCardPhotoUrl] = useState("");
    const [newCardStyle, setNewCardStyle] = useState<"rect" | "drive">("rect");

    const [newSubjectLabel, setNewSubjectLabel] = useState("");
    const [newMappingKelompokCode, setNewMappingKelompokCode] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [cardsRes, mappingsRes] = await Promise.all([
                fetch("/api/admin/kelompok"),
                fetch("/api/admin/kelompok/mappings"),
            ]);

            if (!cardsRes.ok) {
                const payload = await cardsRes.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal memuat data kelompok");
            }

            if (!mappingsRes.ok) {
                const payload = await mappingsRes.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal memuat mapping mata kuliah");
            }

            const cardsData = await cardsRes.json();
            const mappingsData = await mappingsRes.json();

            const mappedCards = Array.isArray(cardsData.cards)
                ? cardsData.cards.map((card: Record<string, unknown>) => ({
                      id: String(card.id),
                      code: String(card.code),
                      name: String(card.name),
                      description: card.description ? String(card.description) : null,
                      photoUrl: card.photoUrl ? String(card.photoUrl) : null,
                      cardStyle:
                          card.cardStyle === KELOMPOK_CARD_STYLE.DRIVE
                              ? "drive"
                              : "rect",
                      isSystem: card.isSystem === true || card.isSystem === 1,
                      isActive: card.isActive === true || card.isActive === 1,
                      sortOrder: Number(card.sortOrder ?? 0),
                  }))
                : [];

            const mappedMappings = Array.isArray(mappingsData.mappings)
                ? mappingsData.mappings.map((row: Record<string, unknown>) => ({
                      id: String(row.id),
                      subjectKey: String(row.subjectKey),
                      subjectLabel: String(row.subjectLabel),
                      kelompokCode: String(row.kelompokCode),
                  }))
                : [];

            const mappedUnmapped = Array.isArray(mappingsData.unmappedSubjects)
                ? mappingsData.unmappedSubjects.map((row: Record<string, unknown>) => ({
                      subjectKey: String(row.subjectKey),
                      subjectLabel: String(row.subjectLabel),
                  }))
                : [];

            setCards(mappedCards);
            setMappings(mappedMappings);
            setUnmappedSubjects(mappedUnmapped);
            setNewMappingKelompokCode((prev) => {
                if (prev) return prev;
                return mappedCards[0]?.code ?? "";
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const cardOptions = useMemo(
        () => cards.map((card) => ({ value: card.code, label: card.name })),
        [cards]
    );

    const handleCreateCard = async () => {
        const normalizedCode = normalizeKelompokCode(newCardCode || newCardName);
        const name = newCardName.trim();

        if (!normalizedCode || !name) {
            setError("Kode dan nama kelompok wajib diisi.");
            return;
        }

        setError("");
        setBusyId("new-card");

        try {
            const res = await fetch("/api/admin/kelompok", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: normalizedCode,
                    name,
                    description: newCardDescription.trim(),
                    photoUrl: newCardPhotoUrl.trim(),
                    cardStyle: newCardStyle,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menambah kartu kelompok");
            }

            setNewCardCode("");
            setNewCardName("");
            setNewCardDescription("");
            setNewCardPhotoUrl("");
            setNewCardStyle("rect");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveCard = async (card: AdminKelompokCard) => {
        setError("");
        setBusyId(card.id);

        try {
            const res = await fetch("/api/admin/kelompok", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: card.id,
                    name: card.name,
                    description: card.description ?? "",
                    photoUrl: card.photoUrl ?? "",
                    cardStyle: card.cardStyle,
                    sortOrder: card.sortOrder,
                    isActive: card.isActive,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menyimpan kartu kelompok");
            }

            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleCreateMapping = async () => {
        const subjectLabel = newSubjectLabel.trim();
        if (!subjectLabel || !newMappingKelompokCode) {
            setError("Pilih kelompok dan isi mata kuliah terlebih dahulu.");
            return;
        }

        setError("");
        setBusyId("new-mapping");

        try {
            const res = await fetch("/api/admin/kelompok/mappings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectLabel,
                    kelompokCode: newMappingKelompokCode,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menambah mapping");
            }

            setNewSubjectLabel("");
            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveMapping = async (row: SubjectMapping) => {
        setError("");
        setBusyId(row.id);

        try {
            const res = await fetch("/api/admin/kelompok/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: row.id,
                    subjectLabel: row.subjectLabel,
                    kelompokCode: row.kelompokCode,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menyimpan mapping");
            }

            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteMapping = async (id: string) => {
        setError("");
        setBusyId(id);

        try {
            const res = await fetch("/api/admin/kelompok/mappings", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menghapus mapping");
            }

            await fetchAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ADMIN</span>
                <span>›</span>
                <span className="text-on-surface/70">KELOMPOK KEILMUAN</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">
                Kelompok Keilmuan
            </h1>
            <p className="text-sm text-on-surface/60 mb-6 max-w-3xl">
                Kelola kartu kategori utama pada dashboard pencarian serta mapping mata kuliah
                ke kategori agar filter berjalan otomatis.
            </p>

            {error && (
                <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <Card>
                    <p className="text-sm text-on-surface/60">Memuat konfigurasi kelompok...</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                        <Card className="xl:col-span-1 space-y-4">
                            <h2 className="text-lg font-display font-semibold text-primary">
                                Tambah Kartu Kelompok
                            </h2>
                            <Input
                                id="new-card-code"
                                label="KODE"
                                placeholder="Contoh: KIMIA_POLIMER"
                                value={newCardCode}
                                onChange={(e) => setNewCardCode(e.target.value)}
                            />
                            <Input
                                id="new-card-name"
                                label="NAMA"
                                placeholder="Contoh: Kimia Polimer"
                                value={newCardName}
                                onChange={(e) => setNewCardName(e.target.value)}
                            />
                            <Textarea
                                id="new-card-description"
                                label="DESKRIPSI"
                                placeholder="Deskripsi singkat kartu"
                                value={newCardDescription}
                                onChange={(e) => setNewCardDescription(e.target.value)}
                            />
                            <Input
                                id="new-card-photo-url"
                                label="PHOTO URL"
                                placeholder="https://..."
                                value={newCardPhotoUrl}
                                onChange={(e) => setNewCardPhotoUrl(e.target.value)}
                            />
                            <Select
                                id="new-card-style"
                                label="GAYA KARTU"
                                value={newCardStyle}
                                onChange={(e) => setNewCardStyle((e.target as HTMLSelectElement).value as "rect" | "drive")}
                                options={[
                                    { value: "rect", label: "Rectangular" },
                                    { value: "drive", label: "Drive-like" },
                                ]}
                            />
                            <Button
                                className="w-full"
                                onClick={handleCreateCard}
                                disabled={busyId === "new-card"}
                            >
                                {busyId === "new-card" ? "Menyimpan..." : "Tambah Kartu"}
                            </Button>
                        </Card>

                        <div className="xl:col-span-2 space-y-4">
                            {cards.map((card) => (
                                <KelompokCardEditor
                                    key={card.id}
                                    initial={card}
                                    busy={busyId === card.id}
                                    onSave={handleSaveCard}
                                />
                            ))}
                        </div>
                    </div>

                    <Card>
                        <h2 className="text-lg font-display font-semibold text-primary mb-4">
                            Mapping Mata Kuliah ke Kelompok
                        </h2>

                        {unmappedSubjects.length > 0 && (
                            <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200">
                                <p className="text-xs text-yellow-700 mb-2">
                                    Mata kuliah belum dipetakan ({unmappedSubjects.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {unmappedSubjects.slice(0, 12).map((row) => (
                                        <button
                                            key={row.subjectKey}
                                            className="px-2 py-1 rounded-md text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                                            onClick={() => setNewSubjectLabel(row.subjectLabel)}
                                            type="button"
                                        >
                                            {row.subjectLabel}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 items-end">
                            <div className="md:col-span-6">
                                <Input
                                    id="new-subject-label"
                                    label="MATA KULIAH"
                                    placeholder="Contoh: KIXX2X Kimia Analitik"
                                    value={newSubjectLabel}
                                    onChange={(e) => setNewSubjectLabel(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-4">
                                <Select
                                    id="new-mapping-kelompok"
                                    label="KELOMPOK"
                                    value={newMappingKelompokCode}
                                    onChange={(e) => setNewMappingKelompokCode((e.target as HTMLSelectElement).value)}
                                    options={cardOptions.length > 0 ? cardOptions : [{ value: "", label: "Belum ada kartu" }]}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button
                                    className="w-full"
                                    onClick={handleCreateMapping}
                                    disabled={busyId === "new-mapping" || cardOptions.length === 0}
                                >
                                    {busyId === "new-mapping" ? "..." : "Tambah"}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {mappings.map((row) => (
                                <MappingRowEditor
                                    key={row.id}
                                    initial={row}
                                    busy={busyId === row.id}
                                    cardOptions={cardOptions}
                                    onSave={handleSaveMapping}
                                    onDelete={handleDeleteMapping}
                                />
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function KelompokCardEditor({
    initial,
    busy,
    onSave,
}: {
    initial: AdminKelompokCard;
    busy: boolean;
    onSave: (card: AdminKelompokCard) => Promise<void>;
}) {
    const [draft, setDraft] = useState(initial);

    useEffect(() => {
        setDraft(initial);
    }, [initial]);

    return (
        <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="data">{draft.code}</Badge>
                    <Badge variant={draft.cardStyle === "drive" ? "subject" : "default"}>
                        {draft.cardStyle === "drive" ? "Drive-like" : "Rectangular"}
                    </Badge>
                    <Badge variant={draft.isActive ? "flag-green" : "flag-yellow"}>
                        {draft.isActive ? "Aktif" : "Diarsipkan"}
                    </Badge>
                    {draft.isSystem && <Badge variant="default">System</Badge>}
                </div>
                <Button
                    variant="secondary"
                    disabled={busy || draft.isSystem}
                    title={draft.isSystem ? "Kartu sistem tidak dapat diarsipkan" : ""}
                    onClick={() => setDraft((prev) => ({ ...prev, isActive: !prev.isActive }))}
                >
                    {draft.isActive ? "Arsipkan" : "Aktifkan"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2 space-y-3">
                    <Input
                        id={`name-${draft.id}`}
                        label="NAMA"
                        value={draft.name}
                        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Textarea
                        id={`description-${draft.id}`}
                        label="DESKRIPSI"
                        value={draft.description ?? ""}
                        onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <Input
                        id={`photo-${draft.id}`}
                        label="PHOTO URL"
                        placeholder="https://..."
                        value={draft.photoUrl ?? ""}
                        onChange={(e) => setDraft((prev) => ({ ...prev, photoUrl: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            id={`style-${draft.id}`}
                            label="GAYA"
                            value={draft.cardStyle}
                            onChange={(e) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    cardStyle: (e.target as HTMLSelectElement).value as "rect" | "drive",
                                }))
                            }
                            options={[
                                { value: "rect", label: "Rectangular" },
                                { value: "drive", label: "Drive-like" },
                            ]}
                        />
                        <Input
                            id={`order-${draft.id}`}
                            label="URUTAN"
                            type="number"
                            value={String(draft.sortOrder)}
                            onChange={(e) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    sortOrder: Number(e.target.value || "0"),
                                }))
                            }
                        />
                    </div>
                </div>

                <CardPreview draft={draft} />
            </div>

            <div className="flex justify-end">
                <Button disabled={busy} onClick={() => onSave(draft)}>
                    {busy ? "Menyimpan..." : "Simpan"}
                </Button>
            </div>
        </Card>
    );
}

function CardPreview({ draft }: { draft: AdminKelompokCard }) {
    if (draft.cardStyle === "drive") {
        return (
            <div className="rounded-md border border-outline-variant/20 bg-surface-container-low p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface/60">
                        <DriveIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-primary">{draft.name || "Nama Kelompok"}</p>
                        <p className="text-xs text-on-surface/50 line-clamp-2">
                            {draft.description || "Deskripsi kartu drive-like."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-outline-variant/20 overflow-hidden bg-surface-container-low">
            {draft.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={draft.photoUrl}
                    alt={draft.name}
                    className="w-full h-28 object-cover"
                />
            ) : (
                <div className="w-full h-28 bg-gradient-to-br from-secondary/20 to-primary/15" />
            )}
            <div className="p-3">
                <p className="text-sm font-semibold text-primary">{draft.name || "Nama Kelompok"}</p>
                <p className="text-xs text-on-surface/50 mt-1 line-clamp-3">
                    {draft.description || "Deskripsi kartu rectangular."}
                </p>
            </div>
        </div>
    );
}

function MappingRowEditor({
    initial,
    busy,
    cardOptions,
    onSave,
    onDelete,
}: {
    initial: SubjectMapping;
    busy: boolean;
    cardOptions: { value: string; label: string }[];
    onSave: (row: SubjectMapping) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [draft, setDraft] = useState(initial);

    useEffect(() => {
        setDraft(initial);
    }, [initial]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end rounded-md border border-outline-variant/20 p-3 bg-surface-container-low">
            <div className="md:col-span-5">
                <Input
                    id={`subject-${draft.id}`}
                    label="MATA KULIAH"
                    value={draft.subjectLabel}
                    onChange={(e) => setDraft((prev) => ({ ...prev, subjectLabel: e.target.value }))}
                />
            </div>
            <div className="md:col-span-3">
                <Input
                    id={`subject-key-${draft.id}`}
                    label="SUBJECT KEY"
                    value={draft.subjectKey}
                    disabled
                />
            </div>
            <div className="md:col-span-2">
                <Select
                    id={`kelompok-${draft.id}`}
                    label="KELOMPOK"
                    value={draft.kelompokCode}
                    onChange={(e) =>
                        setDraft((prev) => ({
                            ...prev,
                            kelompokCode: (e.target as HTMLSelectElement).value,
                        }))
                    }
                    options={cardOptions}
                />
            </div>
            <div className="md:col-span-2 flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => onSave(draft)}>
                    {busy ? "..." : "Simpan"}
                </Button>
                <Button
                    variant="secondary"
                    className="text-red-700 hover:text-red-800"
                    disabled={busy}
                    onClick={() => onDelete(draft.id)}
                >
                    Hapus
                </Button>
            </div>
        </div>
    );
}

function DriveIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
        </svg>
    );
}
