"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn, formatBytes } from "@/lib/utils";
import {
    KELOMPOK_PHOTO_ALLOWED_MIME_TYPES,
    KELOMPOK_CARD_STYLE,
    MAX_KELOMPOK_PHOTO_SIZE,
    normalizeKelompokCode,
    normalizeSubjectKey,
} from "@/types";

type ActiveTab = "cards" | "mappings";

type StatusMessage = {
    type: "success" | "error";
    text: string;
} | null;

type CardFormErrors = {
    code?: string;
    name?: string;
    description?: string;
    photoUrl?: string;
};

type MappingFormErrors = {
    subjectLabel?: string;
    kelompokCode?: string;
};

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
    fileCount: number;
};

type UnmappedSubject = {
    subjectKey: string;
    subjectLabel: string;
};

type UploadInitResponse = {
    driveId?: string;
    uploadUri?: string;
    storedFileName?: string;
    error?: string;
};

type UploadCompleteResponse = {
    photoUrl?: string;
    error?: string;
};

function isValidInternalPhotoUrl(raw: string): boolean {
    if (!raw.startsWith("/api/kelompok/photo?")) {
        return false;
    }

    try {
        const parsed = new URL(raw, "https://internal.local");
        if (parsed.pathname !== "/api/kelompok/photo") {
            return false;
        }

        const driveId = (parsed.searchParams.get("driveId") ?? "").trim();
        const fileId = (parsed.searchParams.get("fileId") ?? "").trim();

        if (driveId !== "A" && driveId !== "B") {
            return false;
        }

        return fileId.length > 0;
    } catch {
        return false;
    }
}

function isValidPhotoUrl(raw: string): boolean {
    if (isValidInternalPhotoUrl(raw)) {
        return true;
    }

    try {
        const url = new URL(raw);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

const REQUEST_TIMEOUT_MS = 15000;
const PHOTO_UPLOAD_TIMEOUT_MS = 120000;

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
    const raw = await res.text();
    if (!raw || raw.trim().length === 0) {
        return null;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        throw new Error(`Respons tidak valid dari server (${res.status}).`);
    }
}

function validatePhotoFile(file: File): string | null {
    if (!(KELOMPOK_PHOTO_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        return `Tipe foto tidak didukung: ${file.type}`;
    }

    if (file.size > MAX_KELOMPOK_PHOTO_SIZE) {
        return `Ukuran foto terlalu besar (${formatBytes(file.size)}). Maksimum ${formatBytes(
            MAX_KELOMPOK_PHOTO_SIZE
        )}.`;
    }

    return null;
}

async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeoutMs = REQUEST_TIMEOUT_MS
) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
            throw new Error(
                "Permintaan terlalu lama diproses. Silakan coba lagi."
            );
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function uploadKelompokPhotoFile(
    file: File,
    setProgress?: (progress: number) => void
): Promise<string> {
    const validationError = validatePhotoFile(file);
    if (validationError) {
        throw new Error(validationError);
    }

    const uploadStartedAt = Date.now();
    setProgress?.(10);

    const initRes = await fetchWithTimeout(
        "/api/admin/kelompok/photo/init",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
            }),
        },
        REQUEST_TIMEOUT_MS
    );

    const initData = await parseJsonResponse<UploadInitResponse>(initRes);
    if (!initRes.ok) {
        throw new Error(
            initData?.error ?? `Gagal menginisialisasi upload foto (${initRes.status})`
        );
    }

    if (!initData?.driveId || !initData.uploadUri || !initData.storedFileName) {
        throw new Error("Respons inisialisasi upload foto tidak lengkap");
    }

    setProgress?.(35);

    const uploadRes = await fetchWithTimeout(
        initData.uploadUri,
        {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
        },
        PHOTO_UPLOAD_TIMEOUT_MS
    );

    if (!uploadRes.ok) {
        throw new Error(`Upload foto gagal (${uploadRes.status})`);
    }

    const driveData = await parseJsonResponse<{ id?: string }>(uploadRes);
    const gdriveFileId =
        driveData && typeof driveData.id === "string" ? driveData.id : null;

    setProgress?.(75);

    const completeRes = await fetchWithTimeout(
        "/api/admin/kelompok/photo/complete",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                driveId: initData.driveId,
                gdriveFileId,
                fileName: initData.storedFileName,
                uploadStartedAt,
                mimeType: file.type,
                sizeBytes: file.size,
            }),
        },
        REQUEST_TIMEOUT_MS
    );

    const completeData = await parseJsonResponse<UploadCompleteResponse>(completeRes);
    if (!completeRes.ok) {
        throw new Error(
            completeData?.error ?? `Gagal menyelesaikan upload foto (${completeRes.status})`
        );
    }

    if (!completeData?.photoUrl) {
        throw new Error("URL foto hasil upload tidak tersedia");
    }

    setProgress?.(100);
    return completeData.photoUrl;
}

export default function AdminKelompokPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeTabFromQuery: ActiveTab =
        searchParams.get("tab") === "mappings" ? "mappings" : "cards";

    const [activeTab, setActiveTab] = useState<ActiveTab>(activeTabFromQuery);

    const [cards, setCards] = useState<AdminKelompokCard[]>([]);
    const [mappings, setMappings] = useState<SubjectMapping[]>([]);
    const [unmappedSubjects, setUnmappedSubjects] = useState<UnmappedSubject[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

    const [newCardCode, setNewCardCode] = useState("");
    const [newCardName, setNewCardName] = useState("");
    const [newCardDescription, setNewCardDescription] = useState("");
    const [newCardPhotoUrl, setNewCardPhotoUrl] = useState("");
    const [newCardStyle, setNewCardStyle] = useState<"rect" | "drive">("rect");
    const [newCardPhotoUploading, setNewCardPhotoUploading] = useState(false);
    const [newCardPhotoUploadProgress, setNewCardPhotoUploadProgress] = useState(0);
    const [createCardErrors, setCreateCardErrors] = useState<CardFormErrors>({});
    const [createCardSubmitError, setCreateCardSubmitError] = useState<string | null>(
        null
    );
    const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);

    const [newSubjectLabel, setNewSubjectLabel] = useState("");
    const [newMappingKelompokCode, setNewMappingKelompokCode] = useState("");
    const [mappingQuery, setMappingQuery] = useState("");
    const [createMappingErrors, setCreateMappingErrors] =
        useState<MappingFormErrors>({});
    const [createMappingSubmitError, setCreateMappingSubmitError] = useState<
        string | null
    >(null);
    const [isCreateMappingModalOpen, setIsCreateMappingModalOpen] = useState(false);
    const [pendingDeleteMapping, setPendingDeleteMapping] =
        useState<SubjectMapping | null>(null);

    useEffect(() => {
        setActiveTab(activeTabFromQuery);
    }, [activeTabFromQuery]);

    const updateTabInUrl = useCallback(
        (nextTab: ActiveTab) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", nextTab);
            const query = params.toString();
            router.replace(
                query ? `/admin/kelompok?${query}` : "/admin/kelompok",
                { scroll: false }
            );
        },
        [router, searchParams]
    );

    const fetchAll = useCallback(async (initial = false) => {
        if (initial) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const [cardsRes, mappingsRes] = await Promise.all([
                fetchWithTimeout("/api/admin/kelompok"),
                fetchWithTimeout("/api/admin/kelompok/mappings"),
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

            const mappedCards: AdminKelompokCard[] = Array.isArray(cardsData.cards)
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

            const mappedMappings: SubjectMapping[] = Array.isArray(mappingsData.mappings)
                ? mappingsData.mappings.map((row: Record<string, unknown>) => ({
                      id: String(row.id),
                      subjectKey: String(row.subjectKey),
                      subjectLabel: String(row.subjectLabel),
                      kelompokCode: String(row.kelompokCode),
                                            fileCount: Number(row.fileCount ?? 0),
                  }))
                : [];

            const mappedUnmapped: UnmappedSubject[] = Array.isArray(
                mappingsData.unmappedSubjects
            )
                ? mappingsData.unmappedSubjects.map((row: Record<string, unknown>) => ({
                      subjectKey: String(row.subjectKey),
                      subjectLabel: String(row.subjectLabel),
                  }))
                : [];

            setCards(mappedCards);
            setMappings(mappedMappings);
            setUnmappedSubjects(mappedUnmapped);
            setNewMappingKelompokCode((prev) => {
                if (prev && mappedCards.some((card) => card.code === prev)) {
                    return prev;
                }
                return mappedCards[0]?.code ?? "";
            });
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAll(true);
    }, [fetchAll]);

    const sortedCards = useMemo(
        () =>
            [...cards].sort(
                (a, b) =>
                    Number(b.isActive) - Number(a.isActive) ||
                    a.sortOrder - b.sortOrder ||
                    a.code.localeCompare(b.code)
            ),
        [cards]
    );

    const cardOptions = useMemo(
        () => sortedCards.map((card) => ({ value: card.code, label: card.name })),
        [sortedCards]
    );

    const mappedSubjectKeys = useMemo(
        () => new Set(mappings.map((row) => row.subjectKey)),
        [mappings]
    );

    const filteredMappings = useMemo(() => {
        const query = mappingQuery.trim().toLowerCase();
        if (!query) return mappings;

        return mappings.filter((row) => {
            return (
                row.subjectLabel.toLowerCase().includes(query) ||
                row.subjectKey.toLowerCase().includes(query) ||
                row.kelompokCode.toLowerCase().includes(query)
            );
        });
    }, [mappings, mappingQuery]);

    const groupedMappings = useMemo(() => {
        const cardOrder = new Map<string, number>();
        for (let i = 0; i < sortedCards.length; i += 1) {
            cardOrder.set(sortedCards[i].code, i);
        }

        const groups = new Map<
            string,
            {
                kelompokCode: string;
                kelompokName: string;
                isActive: boolean;
                items: SubjectMapping[];
            }
        >();

        for (const card of sortedCards) {
            groups.set(card.code, {
                kelompokCode: card.code,
                kelompokName: card.name,
                isActive: card.isActive,
                items: [],
            });
        }

        for (const row of filteredMappings) {
            const group = groups.get(row.kelompokCode);
            if (group) {
                group.items.push(row);
                continue;
            }

            groups.set(row.kelompokCode, {
                kelompokCode: row.kelompokCode,
                kelompokName: row.kelompokCode,
                isActive: true,
                items: [row],
            });
        }

        return Array.from(groups.values())
            .filter((group) => (mappingQuery.trim() ? group.items.length > 0 : true))
            .map((group) => ({
                ...group,
                items: [...group.items].sort((a, b) =>
                    a.subjectLabel.localeCompare(b.subjectLabel)
                ),
            }))
            .sort((a, b) => {
                const orderA = cardOrder.get(a.kelompokCode) ?? Number.MAX_SAFE_INTEGER;
                const orderB = cardOrder.get(b.kelompokCode) ?? Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;
                return a.kelompokName.localeCompare(b.kelompokName);
            });
    }, [filteredMappings, mappingQuery, sortedCards]);

    const activeCardsCount = sortedCards.filter((row) => row.isActive).length;

    const handleTabChange = (nextTab: ActiveTab) => {
        setActiveTab(nextTab);
        updateTabInUrl(nextTab);
    };

    const resetCreateCardForm = useCallback(() => {
        setNewCardCode("");
        setNewCardName("");
        setNewCardDescription("");
        setNewCardPhotoUrl("");
        setNewCardStyle("rect");
        setNewCardPhotoUploading(false);
        setNewCardPhotoUploadProgress(0);
        setCreateCardErrors({});
        setCreateCardSubmitError(null);
    }, []);

    const openCreateCardModal = useCallback(() => {
        resetCreateCardForm();
        setStatusMessage(null);
        setIsCreateCardModalOpen(true);
    }, [resetCreateCardForm]);

    const closeCreateCardModal = useCallback(() => {
        setIsCreateCardModalOpen(false);
    }, []);

    const resetCreateMappingForm = useCallback(() => {
        setNewSubjectLabel("");
        setCreateMappingErrors({});
        setCreateMappingSubmitError(null);
    }, []);

    const openCreateMappingModal = useCallback(
        (prefilledSubjectLabel?: string) => {
            resetCreateMappingForm();
            if (prefilledSubjectLabel) {
                setNewSubjectLabel(prefilledSubjectLabel);
            }
            setNewMappingKelompokCode((prev) => {
                if (prev && sortedCards.some((card) => card.code === prev)) {
                    return prev;
                }
                return sortedCards[0]?.code ?? "";
            });
            setStatusMessage(null);
            setIsCreateMappingModalOpen(true);
        },
        [resetCreateMappingForm, sortedCards]
    );

    const closeCreateMappingModal = useCallback(() => {
        setIsCreateMappingModalOpen(false);
    }, []);

    const handleCreateCardPhotoFileChange = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = "";

        if (!file) {
            return;
        }

        setCreateCardErrors((prev) => ({ ...prev, photoUrl: undefined }));
        setCreateCardSubmitError(null);
        setNewCardPhotoUploadProgress(0);
        setNewCardPhotoUploading(true);

        try {
            const uploadedPhotoUrl = await uploadKelompokPhotoFile(
                file,
                setNewCardPhotoUploadProgress
            );
            setNewCardPhotoUrl(uploadedPhotoUrl);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Gagal mengunggah foto";
            setCreateCardErrors((prev) => ({ ...prev, photoUrl: message }));
            setCreateCardSubmitError(message);
        } finally {
            setNewCardPhotoUploading(false);
        }
    };

    const handleCreateCard = async () => {
        const normalizedCode = normalizeKelompokCode(newCardCode || newCardName);
        const name = newCardName.trim();
        const description = newCardDescription.trim();
        const photoUrl = newCardPhotoUrl.trim();
        setCreateCardSubmitError(null);

        if (newCardPhotoUploading) {
            setStatusMessage({
                type: "error",
                text: "Tunggu sampai upload foto selesai sebelum menyimpan kartu.",
            });
            return;
        }

        const errors: CardFormErrors = {};
        if (!normalizedCode) errors.code = "Kode kelompok wajib diisi";
        if (!name) errors.name = "Nama kelompok wajib diisi";
        if (description.length > 300) {
            errors.description = "Deskripsi maksimal 300 karakter";
        }
        if (photoUrl && !isValidPhotoUrl(photoUrl)) {
            errors.photoUrl = "URL foto tidak valid";
        }

        setCreateCardErrors(errors);

        if (Object.keys(errors).length > 0) {
            setStatusMessage({
                type: "error",
                text: "Periksa kembali data kartu sebelum disimpan.",
            });
            return;
        }

        setBusyId("new-card");
        setStatusMessage(null);

        try {
            const res = await fetchWithTimeout("/api/admin/kelompok", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: normalizedCode,
                    name,
                    description,
                    photoUrl,
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
            setNewCardPhotoUploadProgress(0);
            setCreateCardErrors({});
            setCreateCardSubmitError(null);
            setIsCreateCardModalOpen(false);
            setStatusMessage({
                type: "success",
                text: "Kartu kelompok berhasil ditambahkan.",
            });
            await fetchAll();
        } catch (err) {
            setCreateCardSubmitError(
                err instanceof Error ? err.message : "Terjadi kesalahan"
            );
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveCard = async (card: AdminKelompokCard) => {
        setBusyId(card.id);
        setStatusMessage(null);

        try {
            const res = await fetchWithTimeout("/api/admin/kelompok", {
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

            setStatusMessage({
                type: "success",
                text: `Perubahan untuk ${card.name} berhasil disimpan.`,
            });
            await fetchAll();
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        } finally {
            setBusyId(null);
        }
    };

    const handleCreateMapping = async () => {
        const subjectLabel = newSubjectLabel.trim();
        const subjectKey = normalizeSubjectKey(subjectLabel);
        setCreateMappingSubmitError(null);

        const errors: MappingFormErrors = {};
        if (!subjectLabel) {
            errors.subjectLabel = "Nama mata kuliah wajib diisi";
        } else if (subjectLabel.length > 120) {
            errors.subjectLabel = "Nama mata kuliah maksimal 120 karakter";
        } else if (mappedSubjectKeys.has(subjectKey)) {
            errors.subjectLabel = "Mata kuliah ini sudah memiliki mapping";
        }

        if (!newMappingKelompokCode) {
            errors.kelompokCode = "Pilih kelompok terlebih dahulu";
        }

        setCreateMappingErrors(errors);

        if (Object.keys(errors).length > 0) {
            setStatusMessage({
                type: "error",
                text: "Periksa mapping sebelum ditambahkan.",
            });
            return;
        }

        setBusyId("new-mapping");
        setStatusMessage(null);

        try {
            const res = await fetchWithTimeout("/api/admin/kelompok/mappings", {
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
            setCreateMappingErrors({});
            setCreateMappingSubmitError(null);
            setIsCreateMappingModalOpen(false);
            setStatusMessage({
                type: "success",
                text: "Mapping mata kuliah berhasil ditambahkan.",
            });
            await fetchAll();
        } catch (err) {
            setCreateMappingSubmitError(
                err instanceof Error ? err.message : "Terjadi kesalahan"
            );
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        } finally {
            setBusyId(null);
        }
    };

    const handleSaveMapping = async (row: SubjectMapping) => {
        const nextSubjectLabel = row.subjectLabel.trim();
        if (!nextSubjectLabel) {
            setStatusMessage({
                type: "error",
                text: "Nama mata kuliah wajib diisi.",
            });
            return;
        }

        setBusyId(row.id);
        setStatusMessage(null);

        try {
            const res = await fetchWithTimeout("/api/admin/kelompok/mappings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: row.id,
                    subjectLabel: nextSubjectLabel,
                    kelompokCode: row.kelompokCode,
                }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menyimpan mapping");
            }

            setStatusMessage({
                type: "success",
                text: `Mapping untuk ${nextSubjectLabel} berhasil disimpan.`,
            });
            await fetchAll();
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
        } finally {
            setBusyId(null);
        }
    };

    const handleConfirmDeleteMapping = async () => {
        if (!pendingDeleteMapping) return;

        setBusyId(pendingDeleteMapping.id);
        setStatusMessage(null);

        try {
            const res = await fetchWithTimeout("/api/admin/kelompok/mappings", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: pendingDeleteMapping.id }),
            });

            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload.error ?? "Gagal menghapus mapping");
            }

            setPendingDeleteMapping(null);
            setStatusMessage({
                type: "success",
                text: "Mapping mata kuliah berhasil dihapus.",
            });
            await fetchAll();
        } catch (err) {
            setStatusMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Terjadi kesalahan",
            });
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
                Kelola kartu kategori utama dan mapping mata kuliah dengan alur kerja
                yang terpisah agar lebih cepat dipelihara.
            </p>

            <div aria-live="polite" role="status" className="sr-only">
                {statusMessage?.text ?? ""}
            </div>

            {statusMessage && (
                <div
                    className={cn(
                        "mb-5 rounded-md px-4 py-3 text-sm flex items-start justify-between gap-3",
                        statusMessage.type === "error"
                            ? "bg-red-100/70 text-red-700"
                            : "bg-secondary-container text-on-secondary-container"
                    )}
                >
                    <p>{statusMessage.text}</p>
                    <button
                        type="button"
                        className="text-xs font-medium opacity-80 hover:opacity-100"
                        onClick={() => setStatusMessage(null)}
                    >
                        Tutup
                    </button>
                </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div
                    role="tablist"
                    aria-label="Kelompok tabs"
                    className="inline-flex items-center rounded-md bg-surface-container-low p-1"
                >
                    <TabButton
                        id="tab-cards"
                        selected={activeTab === "cards"}
                        onClick={() => handleTabChange("cards")}
                        label="Kelompok"
                        count={sortedCards.length}
                    />
                    <TabButton
                        id="tab-mappings"
                        selected={activeTab === "mappings"}
                        onClick={() => handleTabChange("mappings")}
                        label="Mata Kuliah"
                        count={mappings.length}
                    />
                </div>

                {refreshing && (
                    <p className="text-xs text-on-surface/50">Memuat ulang data...</p>
                )}
            </div>

            {loading ? (
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-on-surface/60">Memuat konfigurasi kelompok...</p>
                    </div>
                </Card>
            ) : (
                <>
                    {activeTab === "cards" && (
                        <section
                            role="tabpanel"
                            id="panel-cards"
                            aria-labelledby="tab-cards"
                            className="space-y-5"
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <h2 className="text-lg font-display font-semibold text-primary">
                                        Daftar Kartu
                                    </h2>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs text-on-surface/55">
                                            {activeCardsCount} aktif dari {sortedCards.length} kartu
                                        </p>
                                        <Button size="sm" onClick={openCreateCardModal}>
                                            + Tambah Kartu
                                        </Button>
                                    </div>
                                </div>

                                {sortedCards.length === 0 ? (
                                    <Card>
                                        <p className="text-sm text-on-surface/60">
                                            Belum ada kartu kelompok.
                                        </p>
                                    </Card>
                                ) : (
                                    sortedCards.map((card) => (
                                        <KelompokCardEditor
                                            key={card.id}
                                            initial={card}
                                            busy={busyId === card.id}
                                            onSave={handleSaveCard}
                                        />
                                    ))
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === "mappings" && (
                        <section
                            role="tabpanel"
                            id="panel-mappings"
                            aria-labelledby="tab-mappings"
                            className="space-y-5"
                        >
                            <Card className="space-y-5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <h2 className="text-lg font-display font-semibold text-primary">
                                            Mapping Mata Kuliah
                                        </h2>
                                        <p className="text-xs text-on-surface/55 mt-1">
                                            Kelola hubungan mata kuliah ke kategori agar browsing
                                            tetap rapi.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs text-on-surface/55">
                                            {mappings.length} mapping tersimpan
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={() => openCreateMappingModal()}
                                            disabled={cardOptions.length === 0}
                                        >
                                            + Tambah Mata Kuliah
                                        </Button>
                                    </div>
                                </div>

                                {unmappedSubjects.length > 0 && (
                                    <div className="rounded-md bg-tertiary-fixed-dim/20 p-3">
                                        <p className="text-xs text-on-surface/70 mb-2">
                                            Mata kuliah belum dipetakan ({unmappedSubjects.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {unmappedSubjects.slice(0, 18).map((row) => (
                                                <button
                                                    key={row.subjectKey}
                                                    type="button"
                                                    className="px-2 py-1 rounded-md text-xs bg-surface-container-lowest text-on-surface/80 hover:bg-surface-container-high transition-colors"
                                                    onClick={() => {
                                                        openCreateMappingModal(
                                                            row.subjectLabel
                                                        );
                                                    }}
                                                >
                                                    {row.subjectLabel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Input
                                    id="mapping-search"
                                    label="CARI MAPPING"
                                    placeholder="Cari mata kuliah, key, atau kode kelompok"
                                    value={mappingQuery}
                                    onChange={(e) => setMappingQuery(e.target.value)}
                                />
                            </Card>

                            <div className="space-y-4">
                                {filteredMappings.length === 0 ? (
                                    <Card>
                                        <p className="text-sm text-on-surface/60">
                                            Tidak ada mapping yang cocok dengan pencarian.
                                        </p>
                                    </Card>
                                ) : (
                                    groupedMappings.map((group) => (
                                        <Card key={group.kelompokCode} className="space-y-4">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-display font-semibold text-primary">
                                                        {group.kelompokName}
                                                    </p>
                                                    <Badge
                                                        variant={
                                                            group.isActive
                                                                ? "flag-green"
                                                                : "flag-yellow"
                                                        }
                                                    >
                                                        {group.kelompokCode}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-on-surface/55">
                                                    {group.items.length} mata kuliah
                                                </p>
                                            </div>

                                            {group.items.length === 0 ? (
                                                <p className="text-sm text-on-surface/55">
                                                    Belum ada mata kuliah di kelompok ini.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {group.items.map((row) => (
                                                        <MappingCardEditor
                                                            key={row.id}
                                                            initial={row}
                                                            busy={busyId === row.id}
                                                            cardOptions={cardOptions}
                                                            onSave={handleSaveMapping}
                                                            onRequestDelete={(target) =>
                                                                setPendingDeleteMapping(target)
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </>
            )}

            <Modal
                open={isCreateCardModalOpen}
                onClose={closeCreateCardModal}
                title="Tambah Kartu Kelompok"
            >
                <div className="space-y-3">
                    {createCardSubmitError && (
                        <div className="rounded-md px-3 py-2 text-sm bg-red-100/70 text-red-700">
                            {createCardSubmitError}
                        </div>
                    )}
                    <Input
                        id="new-card-code"
                        label="KODE"
                        placeholder="Contoh: KIMIA_POLIMER"
                        value={newCardCode}
                        error={createCardErrors.code}
                        disabled={busyId === "new-card"}
                        onChange={(e) => {
                            setCreateCardErrors((prev) => ({
                                ...prev,
                                code: undefined,
                            }));
                            setNewCardCode(e.target.value);
                        }}
                    />
                    <Input
                        id="new-card-name"
                        label="NAMA"
                        placeholder="Contoh: Kimia Polimer"
                        value={newCardName}
                        error={createCardErrors.name}
                        disabled={busyId === "new-card"}
                        onChange={(e) => {
                            setCreateCardErrors((prev) => ({
                                ...prev,
                                name: undefined,
                            }));
                            setNewCardName(e.target.value);
                        }}
                    />
                    <Textarea
                        id="new-card-description"
                        label="DESKRIPSI"
                        placeholder="Deskripsi singkat kartu"
                        value={newCardDescription}
                        error={createCardErrors.description}
                        disabled={busyId === "new-card"}
                        onChange={(e) => {
                            setCreateCardErrors((prev) => ({
                                ...prev,
                                description: undefined,
                            }));
                            setNewCardDescription(e.target.value);
                        }}
                    />
                    <Input
                        id="new-card-photo-url"
                        label="PHOTO URL (OPSIONAL)"
                        placeholder="https://... atau /api/kelompok/photo?..."
                        value={newCardPhotoUrl}
                        error={createCardErrors.photoUrl}
                        disabled={busyId === "new-card" || newCardPhotoUploading}
                        onChange={(e) => {
                            setCreateCardErrors((prev) => ({
                                ...prev,
                                photoUrl: undefined,
                            }));
                            setNewCardPhotoUrl(e.target.value);
                        }}
                    />
                    <div className="space-y-1.5">
                        <label
                            htmlFor="new-card-photo-file"
                            className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
                        >
                            PHOTO FILE (OPSIONAL)
                        </label>
                        <input
                            id="new-card-photo-file"
                            type="file"
                            accept={KELOMPOK_PHOTO_ALLOWED_MIME_TYPES.join(",")}
                            disabled={busyId === "new-card" || newCardPhotoUploading}
                            className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-surface-container-high file:text-on-surface hover:file:bg-surface-container"
                            onChange={handleCreateCardPhotoFileChange}
                        />
                        <p className="text-xs text-on-surface/55">
                            Tipe: PNG, JPG, WEBP. Maksimal {formatBytes(MAX_KELOMPOK_PHOTO_SIZE)}.
                        </p>
                        {newCardPhotoUploading && (
                            <p className="text-xs text-on-surface/65">
                                Mengunggah foto... {newCardPhotoUploadProgress}%
                            </p>
                        )}
                    </div>
                    <Select
                        id="new-card-style"
                        label="GAYA KARTU"
                        value={newCardStyle}
                        disabled={busyId === "new-card" || newCardPhotoUploading}
                        onChange={(e) =>
                            setNewCardStyle(
                                (e.target as HTMLSelectElement).value as "rect" | "drive"
                            )
                        }
                        options={[
                            { value: "rect", label: "Rectangular" },
                            { value: "drive", label: "Drive-like" },
                        ]}
                    />

                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            variant="ghost"
                            onClick={closeCreateCardModal}
                            disabled={busyId === "new-card" || newCardPhotoUploading}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreateCard}
                            disabled={busyId === "new-card" || newCardPhotoUploading}
                        >
                            {busyId === "new-card"
                                ? "Menyimpan..."
                                : newCardPhotoUploading
                                  ? "Mengunggah foto..."
                                  : "Tambah Kartu"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={isCreateMappingModalOpen}
                onClose={closeCreateMappingModal}
                title="Tambah Mata Kuliah"
            >
                <div className="space-y-3">
                    {createMappingSubmitError && (
                        <div className="rounded-md px-3 py-2 text-sm bg-red-100/70 text-red-700">
                            {createMappingSubmitError}
                        </div>
                    )}
                    <Input
                        id="new-subject-label"
                        label="MATA KULIAH"
                        placeholder="Contoh: KIXX2X Kimia Analitik"
                        value={newSubjectLabel}
                        error={createMappingErrors.subjectLabel}
                        disabled={busyId === "new-mapping"}
                        onChange={(e) => {
                            setCreateMappingErrors((prev) => ({
                                ...prev,
                                subjectLabel: undefined,
                            }));
                            setNewSubjectLabel(e.target.value);
                        }}
                    />

                    <Select
                        id="new-mapping-kelompok"
                        label="KELOMPOK"
                        value={newMappingKelompokCode}
                        error={createMappingErrors.kelompokCode}
                        disabled={busyId === "new-mapping"}
                        onChange={(e) => {
                            setCreateMappingErrors((prev) => ({
                                ...prev,
                                kelompokCode: undefined,
                            }));
                            setNewMappingKelompokCode(
                                (e.target as HTMLSelectElement).value
                            );
                        }}
                        options={
                            cardOptions.length > 0
                                ? cardOptions
                                : [{ value: "", label: "Belum ada kartu" }]
                        }
                    />

                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            variant="ghost"
                            onClick={closeCreateMappingModal}
                            disabled={busyId === "new-mapping"}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreateMapping}
                            disabled={
                                busyId === "new-mapping" || cardOptions.length === 0
                            }
                        >
                            {busyId === "new-mapping" ? "Menyimpan..." : "Tambah"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={Boolean(pendingDeleteMapping)}
                onClose={() => setPendingDeleteMapping(null)}
                title="Hapus Mapping"
            >
                <p className="text-sm text-on-surface/70 mb-4">
                    Mapping untuk <strong>{pendingDeleteMapping?.subjectLabel}</strong> akan
                    dihapus permanen. Lanjutkan?
                </p>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setPendingDeleteMapping(null)}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="secondary"
                        className="text-red-700 hover:text-red-800"
                        disabled={
                            !pendingDeleteMapping || busyId === pendingDeleteMapping.id
                        }
                        onClick={handleConfirmDeleteMapping}
                    >
                        {pendingDeleteMapping && busyId === pendingDeleteMapping.id
                            ? "Menghapus..."
                            : "Hapus Mapping"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function TabButton({
    id,
    label,
    count,
    selected,
    onClick,
}: {
    id: string;
    label: string;
    count: number;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            id={id}
            role="tab"
            aria-selected={selected}
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 rounded-sm text-sm font-medium transition-colors inline-flex items-center gap-2",
                selected
                    ? "bg-surface-container-lowest text-secondary"
                    : "text-on-surface/60 hover:text-on-surface"
            )}
        >
            <span>{label}</span>
            <span className="text-[11px] font-mono opacity-80">{count}</span>
        </button>
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
    const [errors, setErrors] = useState<{
        name?: string;
        description?: string;
        photoUrl?: string;
        sortOrder?: string;
    }>({});
    const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
    const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
    const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
    const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

    useEffect(() => {
        setDraft(initial);
        setErrors({});
        setPhotoUploadBusy(false);
        setPhotoUploadProgress(0);
        setPhotoUploadError(null);
    }, [initial]);

    const handlePhotoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = "";

        if (!file) {
            return;
        }

        setErrors((prev) => ({ ...prev, photoUrl: undefined }));
        setPhotoUploadError(null);
        setPhotoUploadProgress(0);
        setPhotoUploadBusy(true);

        try {
            const uploadedPhotoUrl = await uploadKelompokPhotoFile(
                file,
                setPhotoUploadProgress
            );
            setDraft((prev) => ({ ...prev, photoUrl: uploadedPhotoUrl }));
        } catch (err) {
            setPhotoUploadError(
                err instanceof Error ? err.message : "Gagal mengunggah foto"
            );
        } finally {
            setPhotoUploadBusy(false);
        }
    };

    const handleSave = async () => {
        if (photoUploadBusy) {
            return;
        }

        const name = draft.name.trim();
        const description = (draft.description ?? "").trim();
        const photoUrl = (draft.photoUrl ?? "").trim();

        const nextErrors: {
            name?: string;
            description?: string;
            photoUrl?: string;
            sortOrder?: string;
        } = {};

        if (!name) {
            nextErrors.name = "Nama kelompok wajib diisi";
        } else if (name.length > 80) {
            nextErrors.name = "Nama kelompok maksimal 80 karakter";
        }

        if (description.length > 300) {
            nextErrors.description = "Deskripsi maksimal 300 karakter";
        }

        if (photoUrl && !isValidPhotoUrl(photoUrl)) {
            nextErrors.photoUrl = "URL foto tidak valid";
        }

        if (!Number.isFinite(draft.sortOrder) || draft.sortOrder < 0) {
            nextErrors.sortOrder = "Urutan harus angka 0 atau lebih";
        }

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        await onSave({
            ...draft,
            name,
            description: description || null,
            photoUrl: photoUrl || null,
            sortOrder: Math.floor(draft.sortOrder),
        });
    };

    const handleToggleActive = () => {
        if (busy || photoUploadBusy || draft.isSystem) return;

        if (draft.isActive) {
            setConfirmArchiveOpen(true);
            return;
        }

        setDraft((prev) => ({ ...prev, isActive: true }));
    };

    return (
        <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="data">{draft.code}</Badge>
                    <Badge variant={draft.isActive ? "flag-green" : "flag-yellow"}>
                        {draft.isActive ? "Aktif" : "Diarsipkan"}
                    </Badge>
                    {draft.isSystem && (
                        <span className="text-xs text-on-surface/45">Kartu sistem</span>
                    )}
                </div>

                <Button
                    variant="secondary"
                    className={cn(
                        draft.isActive && "text-red-700 hover:text-red-800"
                    )}
                    disabled={busy || photoUploadBusy || draft.isSystem}
                    title={
                        draft.isSystem
                            ? "Kartu sistem tidak dapat diarsipkan"
                            : ""
                    }
                    onClick={handleToggleActive}
                >
                    {draft.isActive ? "Arsipkan" : "Aktifkan"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_280px] gap-4 items-start">
                <div className="order-2 lg:order-1 space-y-3">
                    <Input
                        id={`name-${draft.id}`}
                        label="NAMA"
                        value={draft.name}
                        disabled={busy}
                        error={errors.name}
                        onChange={(e) => {
                            setErrors((prev) => ({ ...prev, name: undefined }));
                            setDraft((prev) => ({ ...prev, name: e.target.value }));
                        }}
                    />

                    <Textarea
                        id={`description-${draft.id}`}
                        label="DESKRIPSI"
                        value={draft.description ?? ""}
                        disabled={busy}
                        error={errors.description}
                        onChange={(e) => {
                            setErrors((prev) => ({ ...prev, description: undefined }));
                            setDraft((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }));
                        }}
                    />

                    <Input
                        id={`photo-${draft.id}`}
                        label="PHOTO URL (OPSIONAL)"
                        placeholder="https://... atau /api/kelompok/photo?..."
                        value={draft.photoUrl ?? ""}
                        disabled={busy || photoUploadBusy}
                        error={errors.photoUrl}
                        onChange={(e) => {
                            setErrors((prev) => ({ ...prev, photoUrl: undefined }));
                            setDraft((prev) => ({ ...prev, photoUrl: e.target.value }));
                        }}
                    />

                    <div className="space-y-1.5">
                        <label
                            htmlFor={`photo-file-${draft.id}`}
                            className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
                        >
                            PHOTO FILE (OPSIONAL)
                        </label>
                        <input
                            id={`photo-file-${draft.id}`}
                            type="file"
                            accept={KELOMPOK_PHOTO_ALLOWED_MIME_TYPES.join(",")}
                            disabled={busy || photoUploadBusy}
                            className="w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-surface-container-high file:text-on-surface hover:file:bg-surface-container"
                            onChange={handlePhotoFileChange}
                        />
                        <p className="text-xs text-on-surface/55">
                            Tipe: PNG, JPG, WEBP. Maksimal {formatBytes(MAX_KELOMPOK_PHOTO_SIZE)}.
                        </p>
                        {photoUploadBusy && (
                            <p className="text-xs text-on-surface/65">
                                Mengunggah foto... {photoUploadProgress}%
                            </p>
                        )}
                        {photoUploadError && (
                            <p className="text-xs text-red-600">{photoUploadError}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select
                            id={`style-${draft.id}`}
                            label="GAYA"
                            value={draft.cardStyle}
                            disabled={busy || photoUploadBusy}
                            onChange={(e) =>
                                setDraft((prev) => ({
                                    ...prev,
                                    cardStyle: (e.target as HTMLSelectElement)
                                        .value as "rect" | "drive",
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
                            disabled={busy || photoUploadBusy}
                            error={errors.sortOrder}
                            onChange={(e) => {
                                setErrors((prev) => ({ ...prev, sortOrder: undefined }));
                                const parsed = Number(e.target.value);
                                setDraft((prev) => ({
                                    ...prev,
                                    sortOrder: Number.isFinite(parsed) ? parsed : 0,
                                }));
                            }}
                        />
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <CardPreview draft={draft} />
                </div>
            </div>

            <div className="flex justify-end">
                <Button disabled={busy || photoUploadBusy} onClick={handleSave}>
                    {busy
                        ? "Menyimpan..."
                        : photoUploadBusy
                          ? "Mengunggah foto..."
                          : "Simpan"}
                </Button>
            </div>

            <Modal
                open={confirmArchiveOpen}
                onClose={() => setConfirmArchiveOpen(false)}
                title="Arsipkan Kartu"
            >
                <p className="text-sm text-on-surface/70 mb-4">
                    Kartu <strong>{draft.name}</strong> tidak akan tampil di dashboard
                    anggota sampai diaktifkan kembali.
                </p>
                <p className="text-xs text-on-surface/55 mb-4">
                    Perubahan status akan diterapkan setelah Anda menekan tombol Simpan.
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setConfirmArchiveOpen(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="secondary"
                        className="text-red-700 hover:text-red-800"
                        onClick={() => {
                            setDraft((prev) => ({ ...prev, isActive: false }));
                            setConfirmArchiveOpen(false);
                        }}
                    >
                        Arsipkan
                    </Button>
                </div>
            </Modal>
        </Card>
    );
}

function CardPreview({ draft }: { draft: AdminKelompokCard }) {
    if (draft.cardStyle === "drive") {
        return (
            <div className="rounded-md bg-surface-container-low p-4 ghost-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface/60">
                        <DriveIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-primary">
                            {draft.name || "Nama Kelompok"}
                        </p>
                        <p className="text-xs text-on-surface/50 line-clamp-2 mt-0.5">
                            {draft.description || "Deskripsi kartu drive-like."}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md overflow-hidden bg-surface-container-low ghost-border">
            {draft.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={draft.photoUrl}
                    alt={draft.name}
                    className="w-full h-28 object-cover"
                />
            ) : (
                <div className="w-full h-28 bg-surface-container-high" />
            )}
            <div className="p-3">
                <p className="text-sm font-semibold text-primary">
                    {draft.name || "Nama Kelompok"}
                </p>
                <p className="text-xs text-on-surface/50 mt-1 line-clamp-3">
                    {draft.description || "Deskripsi kartu rectangular."}
                </p>
            </div>
        </div>
    );
}

function MappingCardEditor({
    initial,
    busy,
    cardOptions,
    onSave,
    onRequestDelete,
}: {
    initial: SubjectMapping;
    busy: boolean;
    cardOptions: { value: string; label: string }[];
    onSave: (row: SubjectMapping) => Promise<void>;
    onRequestDelete: (row: SubjectMapping) => void;
}) {
    const [draft, setDraft] = useState(initial);
    const [errors, setErrors] = useState<{ subjectLabel?: string }>({});

    useEffect(() => {
        setDraft(initial);
        setErrors({});
    }, [initial]);

    const resolvedSubjectKey = normalizeSubjectKey(draft.subjectLabel);

    const handleSave = async () => {
        const subjectLabel = draft.subjectLabel.trim();

        if (!subjectLabel) {
            setErrors({ subjectLabel: "Nama mata kuliah wajib diisi" });
            return;
        }

        if (subjectLabel.length > 120) {
            setErrors({ subjectLabel: "Nama mata kuliah maksimal 120 karakter" });
            return;
        }

        setErrors({});

        await onSave({
            ...draft,
            subjectLabel,
            subjectKey: resolvedSubjectKey,
            fileCount: draft.fileCount,
        });
    };

    return (
        <Card className="space-y-4 bg-surface-container-low">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="data">{draft.kelompokCode}</Badge>
                    <Badge variant="subject">{draft.fileCount} file</Badge>
                    <span className="text-xs text-on-surface/50 font-mono">
                        {resolvedSubjectKey || "SUBJECT_KEY"}
                    </span>
                </div>
                {busy && (
                    <span className="text-xs text-on-surface/50">Menyimpan perubahan...</span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 items-start">
                <Input
                    id={`subject-${draft.id}`}
                    label="MATA KULIAH"
                    value={draft.subjectLabel}
                    error={errors.subjectLabel}
                    disabled={busy}
                    onChange={(e) => {
                        setErrors({});
                        setDraft((prev) => ({
                            ...prev,
                            subjectLabel: e.target.value,
                        }));
                    }}
                />

                <Select
                    id={`kelompok-${draft.id}`}
                    label="KELOMPOK"
                    value={draft.kelompokCode}
                    disabled={busy}
                    onChange={(e) =>
                        setDraft((prev) => ({
                            ...prev,
                            kelompokCode: (e.target as HTMLSelectElement).value,
                        }))
                    }
                    options={cardOptions}
                />
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    variant="ghost"
                    className="text-red-700 hover:text-red-800"
                    disabled={busy}
                    onClick={() => onRequestDelete(draft)}
                >
                    Hapus
                </Button>
                <Button disabled={busy} onClick={handleSave}>
                    {busy ? "Menyimpan..." : "Simpan"}
                </Button>
            </div>
        </Card>
    );
}

function DriveIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
        </svg>
    );
}
