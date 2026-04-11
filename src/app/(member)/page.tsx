"use client";

import { useState, useEffect, useCallback } from "react";
import { FileGrid } from "@/components/file/FileGrid";
import { Select } from "@/components/ui/Input";

const ITEMS_PER_PAGE_GRID = 24;
const ITEMS_PER_PAGE_LIST = 50;

interface FileData {
    id: string;
    title: string;
    subject: string;
    tags?: string | null;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
    uploaderName?: string;
    uploaderAvatar?: string;
    year?: number | null;
}

export default function BrowsePage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [sort, setSort] = useState("newest");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterType, setFilterType] = useState("");
    const [page, setPage] = useState(1);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Client-side sort
    const sorted = [...files].sort((a, b) => {
        switch (sort) {
            case "oldest": return a.createdAt - b.createdAt;
            case "title": return a.title.localeCompare(b.title);
            case "size": return b.sizeBytes - a.sizeBytes;
            default: return b.createdAt - a.createdAt; // newest
        }
    });

    // Client-side filter
    const filtered = sorted.filter((f) => {
        if (filterSubject && f.subject !== filterSubject) return false;
        if (filterType && f.mimeType !== filterType) return false;
        return true;
    });

    // Pagination
    const perPage = view === "grid" ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_LIST;
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safeCurrentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    // Extract unique subjects for filter dropdown
    const subjects = Array.from(new Set(files.map((f) => f.subject).filter(Boolean)));

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
