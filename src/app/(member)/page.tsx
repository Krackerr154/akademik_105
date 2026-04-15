"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileGrid } from "@/components/file/FileGrid";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
    DEFAULT_DOCUMENT_TYPE_OPTIONS,
    DEFAULT_KELOMPOK_CARD_OPTIONS,
    DocumentTypeOption,
    normalizeDocumentTypeCode,
    normalizeKelompokCode,
    normalizeSubjectKey,
} from "@/types";
import { resolveKelompokCodeForSubject } from "@/lib/kelompok";

const ITEMS_PER_PAGE_GRID = 24;
const ITEMS_PER_PAGE_LIST = 50;

interface FileData {
    id: string;
    title: string;
    subject: string;
    docType?: string | null;
    tags?: string | null;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
    uploaderName?: string;
    uploaderAvatar?: string;
    year?: number | null;
    kelompokCode?: string | null;
}

interface KelompokCardData {
    id?: string;
    code: string;
    name: string;
    description?: string | null;
    photoUrl?: string | null;
    cardStyle?: "rect" | "drive";
    isSystem?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

interface SubjectMappingData {
    subjectKey: string;
    subjectLabel: string;
    kelompokCode: string;
}

export default function BrowsePage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [view, setView] = useState<"grid" | "list">("grid");
    const [sort, setSort] = useState("newest");
    const [selectedKelompok, setSelectedKelompok] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterDocType, setFilterDocType] = useState("");
    const [filterType, setFilterType] = useState("");
    const [page, setPage] = useState(1);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryLoading, setCategoryLoading] = useState(true);
    const [docTypeOptions, setDocTypeOptions] = useState<DocumentTypeOption[]>(
        DEFAULT_DOCUMENT_TYPE_OPTIONS
    );
    const [kelompokCards, setKelompokCards] = useState<KelompokCardData[]>(
        DEFAULT_KELOMPOK_CARD_OPTIONS as KelompokCardData[]
    );
    const [subjectMappings, setSubjectMappings] = useState<SubjectMappingData[]>([]);

    const categoryFromQuery = normalizeKelompokCode(
        String(searchParams.get("category") ?? "")
    );

    useEffect(() => {
        setSelectedKelompok(categoryFromQuery);
    }, [categoryFromQuery]);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/files");
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files ?? []);
            }
        } catch (err) {
            console.error("Gagal memuat file:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    useEffect(() => {
        let alive = true;

        const fetchKelompok = async () => {
            setCategoryLoading(true);
            try {
                const res = await fetch("/api/kelompok");
                if (!res.ok) return;

                const data = await res.json();

                const fetchedCards = Array.isArray(data.cards)
                    ? data.cards.map((c: Record<string, unknown>) => ({
                          id: String(c.id ?? ""),
                          code: String(c.code ?? ""),
                          name: String(c.name ?? ""),
                          description: c.description ? String(c.description) : null,
                          photoUrl: c.photoUrl ? String(c.photoUrl) : null,
                          cardStyle: c.cardStyle === "drive" ? "drive" : "rect",
                          isSystem: c.isSystem === 1 || c.isSystem === true,
                          isActive: c.isActive === 1 || c.isActive === true,
                          sortOrder: Number(c.sortOrder ?? 0),
                      }))
                    : [];

                const fetchedMappings = Array.isArray(data.mappings)
                    ? data.mappings.map((m: Record<string, unknown>) => ({
                          subjectKey: String(m.subjectKey ?? ""),
                          subjectLabel: String(m.subjectLabel ?? ""),
                          kelompokCode: String(m.kelompokCode ?? ""),
                      }))
                    : [];

                if (alive) {
                    if (fetchedCards.length > 0) {
                        setKelompokCards(fetchedCards);
                    }
                    setSubjectMappings(fetchedMappings);
                }
            } catch (err) {
                console.error("Gagal memuat kelompok:", err);
            } finally {
                if (alive) {
                    setCategoryLoading(false);
                }
            }
        };

        fetchKelompok();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;

        const fetchDocumentTypes = async () => {
            try {
                const res = await fetch("/api/document-types");
                if (!res.ok) return;

                const data = await res.json();
                const fetched = Array.isArray(data.types)
                    ? data.types.map((t: Record<string, unknown>) => ({
                          code: String(t.code ?? ""),
                          label: String(t.label ?? ""),
                          isSystem: t.isSystem === 1 || t.isSystem === true,
                          isActive: t.isActive === 1 || t.isActive === true,
                          sortOrder: Number(t.sortOrder ?? 0),
                      }))
                    : [];

                if (alive && fetched.length > 0) {
                    setDocTypeOptions(fetched);
                }
            } catch (err) {
                console.error("Gagal memuat tipe dokumen:", err);
            }
        };

        fetchDocumentTypes();

        return () => {
            alive = false;
        };
    }, []);

    const mappingBySubject = useMemo(() => {
        const map = new Map<string, string>();
        for (const row of subjectMappings) {
            const key = normalizeSubjectKey(row.subjectKey);
            if (key) {
                map.set(key, row.kelompokCode);
            }
        }
        return map;
    }, [subjectMappings]);

    const filesWithKelompok = useMemo(
        () =>
            files.map((file) => ({
                ...file,
                kelompokCode:
                    file.kelompokCode ??
                    resolveKelompokCodeForSubject(file.subject, mappingBySubject),
            })),
        [files, mappingBySubject]
    );

    // Client-side sort
    const sorted = [...filesWithKelompok].sort((a, b) => {
        switch (sort) {
            case "oldest": return a.createdAt - b.createdAt;
            case "title": return a.title.localeCompare(b.title);
            case "size": return b.sizeBytes - a.sizeBytes;
            default: return b.createdAt - a.createdAt; // newest
        }
    });

    // Client-side filter
    const filtered = sorted.filter((f) => {
        if (selectedKelompok && f.kelompokCode !== selectedKelompok) return false;
        if (filterSubject && f.subject !== filterSubject) return false;
        if (filterDocType && normalizeDocumentTypeCode(f.docType ?? "") !== filterDocType) return false;
        if (filterType && f.mimeType !== filterType) return false;
        return true;
    });

    // Pagination
    const perPage = view === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_LIST;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safeCurrentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const activeCards = useMemo(
        () =>
            [...kelompokCards]
                .filter((card) => card.isActive !== false)
                .sort(
                    (a, b) =>
                        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
                        a.code.localeCompare(b.code)
                ),
        [kelompokCards]
    );

    const rectCards = activeCards.filter((card) => card.cardStyle !== "drive");
    const driveCards = activeCards.filter((card) => card.cardStyle === "drive");

    const subjectPool = selectedKelompok
        ? filesWithKelompok.filter((f) => f.kelompokCode === selectedKelompok)
        : filesWithKelompok;

    // Extract unique subjects for filter dropdown
    const subjects = Array.from(new Set(subjectPool.map((f) => f.subject).filter(Boolean)));

    const selectedCard = activeCards.find((card) => card.code === selectedKelompok);

    const handleSelectKelompok = (code: string) => {
        const nextCode = selectedKelompok === code ? "" : code;
        setSelectedKelompok(nextCode);
        setFilterSubject("");
        setPage(1);

        const nextParams = new URLSearchParams(searchParams.toString());
        if (nextCode) {
            nextParams.set("category", nextCode);
        } else {
            nextParams.delete("category");
        }

        const query = nextParams.toString();
        router.replace(query ? `/?${query}` : "/", { scroll: false });
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ARSIP</span>
                <span>›</span>
                <span className="text-on-surface/70">JELAJAHI FILE</span>
            </div>

            {/* Page header */}
            <h1 className="text-3xl font-display font-bold text-primary mb-2">
                Repositori Akademik
            </h1>
            <p className="text-on-surface/60 text-sm mb-6 max-w-xl">
                Akses koleksi catatan kuliah, dokumen, dan draf yang telah dikurasi dari
                berbagai mata kuliah.
            </p>

            {/* Kelompok cards */}
            <div className="mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <h2 className="text-base font-display font-semibold text-primary">
                        Kelompok Keilmuan
                    </h2>
                    <button
                        onClick={() => handleSelectKelompok("")}
                        className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                            !selectedKelompok
                                ? "bg-secondary/12 text-secondary"
                                : "bg-surface-container-low text-on-surface/60 hover:text-on-surface"
                        }`}
                    >
                        Semua Kategori
                    </button>
                </div>

                {categoryLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[1, 2, 3].map((idx) => (
                            <div key={idx} className="h-32 rounded-md bg-surface-container-low animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <>
                        {rectCards.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                                {rectCards.map((card) => (
                                    <button
                                        key={card.code}
                                        onClick={() => handleSelectKelompok(card.code)}
                                        className={`text-left rounded-md overflow-hidden border transition-colors ${
                                            selectedKelompok === card.code
                                                ? "border-secondary bg-secondary/5"
                                                : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high"
                                        }`}
                                    >
                                        {card.photoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={card.photoUrl}
                                                alt={card.name}
                                                className="w-full h-20 object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-20 bg-gradient-to-br from-secondary/25 to-primary/15" />
                                        )}
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-primary">{card.name}</p>
                                            <p className="text-xs text-on-surface/60 mt-1 line-clamp-2">
                                                {card.description || "Kategori utama kelompok keilmuan."}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {driveCards.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                {driveCards.map((card) => (
                                    <button
                                        key={card.code}
                                        onClick={() => handleSelectKelompok(card.code)}
                                        className={`text-left rounded-md border px-4 py-3 transition-colors ${
                                            selectedKelompok === card.code
                                                ? "border-secondary bg-secondary/5"
                                                : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface/60">
                                                <DriveLikeIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-primary">{card.name}</p>
                                                    <Badge variant="subject">Drive</Badge>
                                                </div>
                                                <p className="text-xs text-on-surface/60 mt-0.5 line-clamp-1">
                                                    {card.description || "Kategori khusus."}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedCard && (
                <div className="mb-4 text-xs text-on-surface/60">
                    Menampilkan kategori: <span className="font-semibold text-primary">{selectedCard.name}</span>
                </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Select
                        options={[
                            { value: "", label: "Semua Mata Kuliah" },
                            ...subjects.map((s) => ({ value: s, label: s })),
                        ]}
                        label="MATA KULIAH"
                        value={filterSubject}
                        onChange={(e) => {
                            setFilterSubject((e.target as HTMLSelectElement).value);
                            setPage(1);
                        }}
                        className="w-48"
                    />
                    <Select
                        options={[
                            { value: "", label: "Semua Tipe Dokumen" },
                            ...docTypeOptions
                                .filter((opt) => opt.isActive !== false)
                                .map((opt) => ({ value: opt.code, label: opt.label })),
                        ]}
                        label="TIPE DOKUMEN"
                        value={filterDocType}
                        onChange={(e) => {
                            setFilterDocType((e.target as HTMLSelectElement).value);
                            setPage(1);
                        }}
                        className="w-48"
                    />
                    <Select
                        options={[
                            { value: "", label: "Semua Tipe" },
                            { value: "application/pdf", label: "PDF" },
                            { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX" },
                            { value: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PPTX" },
                            { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "XLSX" },
                        ]}
                        label="FORMAT"
                        value={filterType}
                        onChange={(e) => {
                            setFilterType((e.target as HTMLSelectElement).value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Select
                        options={[
                            { value: "newest", label: "Terbaru" },
                            { value: "oldest", label: "Terlama" },
                            { value: "title", label: "A-Z" },
                            { value: "size", label: "Ukuran" },
                        ]}
                        label="URUTKAN"
                        value={sort}
                        onChange={(e) => setSort((e.target as HTMLSelectElement).value)}
                    />

                    {/* View toggle */}
                    <div className="flex items-center gap-1 bg-surface-container-low rounded-md p-1">
                        <button
                            onClick={() => { setView("grid"); setPage(1); }}
                            className={`p-1.5 rounded-sm transition-colors ${view === "grid"
                                ? "bg-surface-container-lowest text-secondary"
                                : "text-on-surface/40 hover:text-on-surface"
                                }`}
                        >
                            <GridIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setView("list"); setPage(1); }}
                            className={`p-1.5 rounded-sm transition-colors ${view === "list"
                                ? "bg-surface-container-lowest text-secondary"
                                : "text-on-surface/40 hover:text-on-surface"
                                }`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm text-on-surface/50">Memuat file...</p>
                </div>
            ) : (
                <>
                    {/* File count */}
                    <p className="text-xs text-on-surface/40 mb-4">
                        {filtered.length} file ditemukan
                    </p>

                    {/* File grid/list */}
                    <FileGrid files={paginated} view={view} />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safeCurrentPage <= 1}
                                className="px-3 py-1.5 text-xs rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Sebelumnya
                            </button>
                            <span className="text-xs text-on-surface/50">
                                Halaman {safeCurrentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safeCurrentPage >= totalPages}
                                className="px-3 py-1.5 text-xs rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Selanjutnya →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function GridIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
        </svg>
    );
}

function ListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}

function DriveLikeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
    );
}
