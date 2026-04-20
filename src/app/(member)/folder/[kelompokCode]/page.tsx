"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FileGrid } from "@/components/file/FileGrid";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
    DEFAULT_DOCUMENT_TYPE_OPTIONS,
    DocumentTypeOption,
    normalizeKelompokCode,
    normalizeSubjectKey,
} from "@/types";

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

interface SubjectCardData {
    subjectKey: string;
    subjectLabel: string;
    kelompokCode: string;
    fileCount: number;
}

interface FilesApiMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

type ContentTab = "mata-kuliah" | "file";
type KelompokLoadError = "unauthorized" | "forbidden" | "server" | "network";

export default function KelompokFolderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams<{ kelompokCode: string }>();

    const kelompokCodeFromRoute = normalizeKelompokCode(
        Array.isArray(params?.kelompokCode)
            ? String(params.kelompokCode[0] ?? "")
            : String(params?.kelompokCode ?? "")
    );

    const subjectFromQuery = normalizeSubjectKey(
        String(searchParams.get("subject") ?? "")
    );

    const [view, setView] = useState<"grid" | "list">("grid");
    const [sort, setSort] = useState("newest");
    const [selectedSubjectKey, setSelectedSubjectKey] = useState("");
    const [contentTab, setContentTab] = useState<ContentTab>("mata-kuliah");
    const [filterDocType, setFilterDocType] = useState("");
    const [filterType, setFilterType] = useState("");
    const [page, setPage] = useState(1);
    const perPage = view === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_LIST;

    const [files, setFiles] = useState<FileData[]>([]);
    const [filesMeta, setFilesMeta] = useState<FilesApiMeta>({
        total: 0,
        page: 1,
        pageSize: perPage,
        totalPages: 1,
    });
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [loadingKelompok, setLoadingKelompok] = useState(true);
    const [kelompokLoadError, setKelompokLoadError] =
        useState<KelompokLoadError | null>(null);

    const [docTypeOptions, setDocTypeOptions] = useState<DocumentTypeOption[]>(
        DEFAULT_DOCUMENT_TYPE_OPTIONS
    );
    const [kelompokCards, setKelompokCards] = useState<KelompokCardData[]>([]);
    const [subjectCards, setSubjectCards] = useState<SubjectCardData[]>([]);

    useEffect(() => {
        setSelectedSubjectKey(subjectFromQuery);
    }, [subjectFromQuery]);

    useEffect(() => {
        if (selectedSubjectKey) {
            setContentTab("file");
            return;
        }
        setContentTab("mata-kuliah");
    }, [selectedSubjectKey]);

    const updateSubjectQuery = useCallback(
        (nextSubjectKey: string) => {
            const paramsObj = new URLSearchParams(searchParams.toString());
            if (nextSubjectKey) {
                paramsObj.set("subject", nextSubjectKey);
            } else {
                paramsObj.delete("subject");
            }

            const query = paramsObj.toString();
            const basePath = `/folder/${kelompokCodeFromRoute}`;
            router.replace(query ? `${basePath}?${query}` : basePath, {
                scroll: false,
            });
        },
        [kelompokCodeFromRoute, router, searchParams]
    );

    useEffect(() => {
        let alive = true;

        const fetchKelompok = async () => {
            setLoadingKelompok(true);
            setKelompokLoadError(null);
            try {
                const res = await fetch("/api/kelompok");
                if (!res.ok) {
                    if (alive) {
                        setKelompokCards([]);
                        setSubjectCards([]);

                        if (res.status === 401) {
                            setKelompokLoadError("unauthorized");
                        } else if (res.status === 403) {
                            setKelompokLoadError("forbidden");
                        } else {
                            setKelompokLoadError("server");
                        }
                    }
                    return;
                }

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

                const fetchedSubjectCards = Array.isArray(data.subjectCards)
                    ? data.subjectCards.map((m: Record<string, unknown>) => ({
                          subjectKey: String(m.subjectKey ?? ""),
                          subjectLabel: String(m.subjectLabel ?? ""),
                          kelompokCode: String(m.kelompokCode ?? ""),
                          fileCount: Number(m.fileCount ?? 0),
                      }))
                    : [];

                if (alive) {
                    setKelompokCards(fetchedCards);
                    setSubjectCards(fetchedSubjectCards);
                }
            } catch (err) {
                console.error("Gagal memuat kelompok:", err);
                if (alive) {
                    setKelompokCards([]);
                    setSubjectCards([]);
                    setKelompokLoadError("network");
                }
            } finally {
                if (alive) setLoadingKelompok(false);
            }
        };

        fetchKelompok();

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        let alive = true;

        const fetchFiles = async () => {
            if (!kelompokCodeFromRoute || !selectedSubjectKey) {
                if (!alive) return;
                setFiles([]);
                setFilesMeta({
                    total: 0,
                    page: 1,
                    pageSize: perPage,
                    totalPages: 1,
                });
                setLoadingFiles(false);
                return;
            }

            setLoadingFiles(true);
            try {
                const params = new URLSearchParams();
                params.set("category", kelompokCodeFromRoute);
                params.set("subject", selectedSubjectKey);
                params.set("sort", sort);
                params.set("page", String(page));
                params.set("pageSize", String(perPage));

                if (filterDocType) {
                    params.set("docType", filterDocType);
                }

                if (filterType) {
                    params.set("mimeType", filterType);
                }

                const res = await fetch(`/api/files?${params.toString()}`);
                if (!res.ok) return;

                const data = await res.json();
                if (!alive) return;

                const nextMeta: FilesApiMeta = {
                    total: Number(data?.meta?.total ?? 0),
                    page: Number(data?.meta?.page ?? 1),
                    pageSize: Number(data?.meta?.pageSize ?? perPage),
                    totalPages: Math.max(1, Number(data?.meta?.totalPages ?? 1)),
                };

                setFiles(Array.isArray(data?.files) ? data.files : []);
                setFilesMeta(nextMeta);

                if (nextMeta.page !== page) {
                    setPage(nextMeta.page);
                }
            } catch (err) {
                console.error("Gagal memuat file:", err);
            } finally {
                if (alive) setLoadingFiles(false);
            }
        };

        fetchFiles();

        return () => {
            alive = false;
        };
    }, [
        filterDocType,
        filterType,
        kelompokCodeFromRoute,
        page,
        perPage,
        selectedSubjectKey,
        sort,
    ]);

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

    const selectedCard = activeCards.find(
        (card) => card.code === kelompokCodeFromRoute
    );

    const selectedKelompokSubjects = useMemo(
        () =>
            subjectCards
                .filter((row) => row.kelompokCode === kelompokCodeFromRoute)
                .sort(
                    (a, b) =>
                        b.fileCount - a.fileCount ||
                        a.subjectLabel.localeCompare(b.subjectLabel)
                ),
        [subjectCards, kelompokCodeFromRoute]
    );

    const selectedSubjectCard = selectedKelompokSubjects.find(
        (row) => row.subjectKey === selectedSubjectKey
    );

    useEffect(() => {
        if (!selectedSubjectKey) return;
        if (selectedSubjectCard) return;

        setSelectedSubjectKey("");
        setPage(1);
        setContentTab("mata-kuliah");
        updateSubjectQuery("");
    }, [selectedSubjectCard, selectedSubjectKey, updateSubjectQuery]);

    const totalPages = filesMeta.totalPages;
    const safeCurrentPage = filesMeta.page;
    const totalFiles = filesMeta.total;

    const handleSelectSubject = (subjectKey: string) => {
        const normalized = normalizeSubjectKey(subjectKey);
        const nextKey = selectedSubjectKey === normalized ? "" : normalized;

        setSelectedSubjectKey(nextKey);
        setPage(1);
        if (nextKey) {
            setContentTab("file");
        } else {
            setContentTab("mata-kuliah");
        }
        updateSubjectQuery(nextKey);
    };

    const clearSubjectSelection = () => {
        setSelectedSubjectKey("");
        setPage(1);
        setContentTab("mata-kuliah");
        updateSubjectQuery("");
    };

    const kelompokErrorMessage = useMemo(() => {
        if (kelompokLoadError === "unauthorized") {
            return "Sesi login berakhir. Silakan masuk ulang untuk memuat data kelompok.";
        }

        if (kelompokLoadError === "forbidden") {
            return "Akun Anda tidak memiliki izin untuk membuka data kelompok.";
        }

        if (kelompokLoadError === "network") {
            return "Koneksi ke server bermasalah saat memuat data kelompok.";
        }

        if (kelompokLoadError === "server") {
            return "Server gagal memuat data kelompok. Coba lagi beberapa saat.";
        }

        return "";
    }, [kelompokLoadError]);

    const isInvalidKelompok =
        !loadingKelompok && kelompokLoadError === null && !selectedCard;

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="hover:text-on-surface/80 transition-colors"
                >
                    Akademik 105
                </button>
                {selectedCard && (
                    <>
                        <span>›</span>
                        <span className="text-on-surface/70">{selectedCard.name}</span>
                    </>
                )}
                {selectedSubjectCard && (
                    <>
                        <span>›</span>
                        <span className="text-on-surface/70">
                            {selectedSubjectCard.subjectLabel}
                        </span>
                    </>
                )}
            </div>

            <h1 className="text-3xl font-display font-bold text-primary mb-2">
                Repositori Akademik
            </h1>
            <p className="text-on-surface/60 text-sm mb-6 max-w-xl">
                Akses koleksi mata kuliah dan file dari kelompok keilmuan terpilih.
            </p>

            {loadingKelompok ? (
                <Card>
                    <p className="text-sm text-on-surface/60">Memuat data kelompok...</p>
                </Card>
            ) : kelompokLoadError ? (
                <Card className="space-y-3">
                    <p className="text-sm text-on-surface/70">{kelompokErrorMessage}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {(kelompokLoadError === "server" ||
                            kelompokLoadError === "network") && (
                            <Button size="sm" onClick={() => window.location.reload()}>
                                Coba Muat Ulang
                            </Button>
                        )}
                        {kelompokLoadError === "unauthorized" && (
                            <Button size="sm" onClick={() => router.push("/login")}>
                                Masuk Ulang
                            </Button>
                        )}
                        <button
                            type="button"
                            onClick={() => router.push("/")}
                            className="min-h-11 px-3 py-1.5 text-sm rounded-md bg-surface-container-low text-on-surface/70 hover:text-on-surface transition-colors"
                        >
                            Kembali ke Jelajahi
                        </button>
                    </div>
                </Card>
            ) : isInvalidKelompok ? (
                <Card className="space-y-3">
                    <p className="text-sm text-on-surface/70">
                        Kode kelompok
                        <span className="font-mono"> {kelompokCodeFromRoute || "-"}</span>
                        tidak ditemukan atau sedang tidak aktif.
                    </p>
                    <p className="text-xs text-on-surface/55">
                        Periksa tautan yang dibuka, lalu pilih ulang kelompok dari halaman
                        jelajah.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => router.push("/")}>
                            Kembali ke Jelajahi
                        </Button>
                    </div>
                </Card>
            ) : (
                <>
                    <div className="mb-6">
                        <div
                            role="tablist"
                            aria-label="Drive browsing tabs"
                            className="inline-flex items-center rounded-md bg-surface-container-low p-1"
                        >
                            <DriveTabButton
                                label="Mata Kuliah"
                                selected={contentTab === "mata-kuliah"}
                                count={selectedKelompokSubjects.length}
                                onClick={() => setContentTab("mata-kuliah")}
                            />
                            {selectedSubjectCard && (
                                <DriveTabButton
                                    label="File"
                                    selected={contentTab === "file"}
                                    count={totalFiles}
                                    onClick={() => setContentTab("file")}
                                />
                            )}
                        </div>
                    </div>

                    {contentTab === "mata-kuliah" && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                <h2 className="text-base font-display font-semibold text-primary">
                                    Mata Kuliah di {selectedCard?.name}
                                </h2>
                                <button
                                    onClick={clearSubjectSelection}
                                    className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                                        !selectedSubjectKey
                                            ? "bg-secondary/12 text-secondary"
                                            : "bg-surface-container-low text-on-surface/60 hover:text-on-surface"
                                    }`}
                                >
                                    Semua Mata Kuliah
                                </button>
                            </div>

                            {selectedKelompokSubjects.length === 0 ? (
                                <Card>
                                    <p className="text-sm text-on-surface/60">
                                        Belum ada mata kuliah yang dipetakan untuk kelompok ini.
                                    </p>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {selectedKelompokSubjects.map((subjectCard) => (
                                        <button
                                            key={subjectCard.subjectKey}
                                            onClick={() =>
                                                handleSelectSubject(subjectCard.subjectKey)
                                            }
                                            className={`text-left rounded-md border px-4 py-3 transition-colors ${
                                                selectedSubjectKey === subjectCard.subjectKey
                                                    ? "border-secondary bg-secondary/5"
                                                    : "border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-primary line-clamp-2">
                                                        {subjectCard.subjectLabel}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-on-surface/50 mt-1">
                                                        {subjectCard.subjectKey}
                                                    </p>
                                                </div>
                                                <Badge variant="data">
                                                    {subjectCard.fileCount} file
                                                </Badge>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSubjectCard && contentTab === "file" && (
                        <>
                            <div className="mb-4 text-sm md:text-xs text-on-surface/60">
                                Menampilkan: <span className="font-semibold text-primary">{selectedCard?.name}</span>
                                <span> › </span>
                                <span className="font-semibold text-primary">
                                    {selectedSubjectCard.subjectLabel}
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-3 w-full md:w-auto">
                                    <Select
                                        options={[
                                            { value: "", label: "Semua Mata Kuliah" },
                                            ...selectedKelompokSubjects.map((s) => ({
                                                value: s.subjectKey,
                                                label: s.subjectLabel,
                                            })),
                                        ]}
                                        label="MATA KULIAH"
                                        value={selectedSubjectKey}
                                        onChange={(e) => {
                                            const nextKey = normalizeSubjectKey(
                                                (e.target as HTMLSelectElement).value
                                            );
                                            if (!nextKey) {
                                                clearSubjectSelection();
                                                return;
                                            }
                                            handleSelectSubject(nextKey);
                                        }}
                                        className="w-full sm:w-56"
                                    />
                                    <Select
                                        options={[
                                            { value: "", label: "Semua Tipe Dokumen" },
                                            ...docTypeOptions
                                                .filter((opt) => opt.isActive !== false)
                                                .map((opt) => ({
                                                    value: opt.code,
                                                    label: opt.label,
                                                })),
                                        ]}
                                        label="TIPE DOKUMEN"
                                        value={filterDocType}
                                        onChange={(e) => {
                                            setFilterDocType(
                                                (e.target as HTMLSelectElement).value
                                            );
                                            setPage(1);
                                        }}
                                        className="w-full sm:w-48"
                                    />
                                    <Select
                                        options={[
                                            { value: "", label: "Semua Tipe" },
                                            { value: "application/pdf", label: "PDF" },
                                            {
                                                value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                                label: "DOCX",
                                            },
                                            {
                                                value: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                                label: "PPTX",
                                            },
                                            {
                                                value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                                label: "XLSX",
                                            },
                                        ]}
                                        label="FORMAT"
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType((e.target as HTMLSelectElement).value);
                                            setPage(1);
                                        }}
                                        className="w-full sm:w-48"
                                    />
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                                    <Select
                                        options={[
                                            { value: "newest", label: "Terbaru" },
                                            { value: "oldest", label: "Terlama" },
                                            { value: "title", label: "A-Z" },
                                            { value: "size", label: "Ukuran" },
                                        ]}
                                        label="URUTKAN"
                                        value={sort}
                                        onChange={(e) => {
                                            setSort((e.target as HTMLSelectElement).value);
                                            setPage(1);
                                        }}
                                        className="w-full sm:w-40"
                                    />

                                    <div className="flex items-center gap-1 bg-surface-container-low rounded-md p-1">
                                        <button
                                            onClick={() => {
                                                setView("grid");
                                                setPage(1);
                                            }}
                                            className={`w-11 h-11 rounded-sm flex items-center justify-center transition-colors ${
                                                view === "grid"
                                                    ? "bg-surface-container-lowest text-secondary"
                                                    : "text-on-surface/40 hover:text-on-surface"
                                            }`}
                                            aria-label="Tampilan grid"
                                        >
                                            <GridIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setView("list");
                                                setPage(1);
                                            }}
                                            className={`w-11 h-11 rounded-sm flex items-center justify-center transition-colors ${
                                                view === "list"
                                                    ? "bg-surface-container-lowest text-secondary"
                                                    : "text-on-surface/40 hover:text-on-surface"
                                            }`}
                                            aria-label="Tampilan daftar"
                                        >
                                            <ListIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {loadingFiles ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                                    <p className="text-sm text-on-surface/50">Memuat file...</p>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-on-surface/40 mb-4">
                                        {totalFiles} file ditemukan
                                    </p>

                                    <FileGrid files={files} view={view} />

                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                                            <button
                                                onClick={() =>
                                                    setPage((p) => Math.max(1, p - 1))
                                                }
                                                disabled={safeCurrentPage <= 1}
                                                className="min-h-11 px-4 py-2 text-sm rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Sebelumnya
                                            </button>
                                            <span className="text-sm sm:text-xs text-on-surface/50">
                                                Halaman {safeCurrentPage} dari {totalPages}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    setPage((p) =>
                                                        Math.min(totalPages, p + 1)
                                                    )
                                                }
                                                disabled={safeCurrentPage >= totalPages}
                                                className="min-h-11 px-4 py-2 text-sm rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Selanjutnya →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function GridIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
        </svg>
    );
}

function DriveTabButton({
    label,
    count,
    selected,
    onClick,
}: {
    label: string;
    count: number;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={onClick}
            className={`min-h-11 px-3 py-1.5 rounded-sm text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                selected
                    ? "bg-surface-container-lowest text-secondary"
                    : "text-on-surface/60 hover:text-on-surface"
            }`}
        >
            <span>{label}</span>
            <span className="text-[11px] font-mono opacity-80">{count}</span>
        </button>
    );
}

function ListIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
    );
}

function Button({
    children,
    className,
    size,
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md";
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 gradient-cta text-on-secondary hover:opacity-90 active:opacity-80 ${
                size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-sm"
            } ${className ?? ""}`}
        >
            {children}
        </button>
    );
}
