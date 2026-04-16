"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileGrid } from "@/components/file/FileGrid";

const PAGE_SIZE = 24;

interface FileData {
    id: string;
    title: string;
    subject: string;
    docType?: string | null;
    tags?: string | null;
    abstract?: string | null;
    authors?: string | null;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
}

interface FilesApiMeta {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
}

interface FilesApiResponse {
    files?: FileData[];
    meta?: FilesApiMeta;
}

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const queryFromUrl = searchParams.get("q") ?? "";
    const pageFromUrlRaw = Number(searchParams.get("page") ?? "1");
    const pageFromUrl = Number.isFinite(pageFromUrlRaw) && pageFromUrlRaw > 0
        ? Math.floor(pageFromUrlRaw)
        : 1;

    const [queryInput, setQueryInput] = useState(queryFromUrl);
    const [debouncedQuery, setDebouncedQuery] = useState(queryFromUrl);
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
    });

    const updateUrl = (nextQuery: string, nextPage: number) => {
        const params = new URLSearchParams(searchParams.toString());

        if (nextQuery.trim()) {
            params.set("q", nextQuery.trim());
        } else {
            params.delete("q");
        }

        if (nextPage > 1) {
            params.set("page", String(nextPage));
        } else {
            params.delete("page");
        }

        const nextQueryString = params.toString();
        router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search", {
            scroll: false,
        });
    };

    useEffect(() => {
        setQueryInput(queryFromUrl);
        setDebouncedQuery(queryFromUrl);
    }, [queryFromUrl]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedQuery(queryInput.trim());
        }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [queryInput]);

    useEffect(() => {
        if (debouncedQuery === queryFromUrl) return;
        updateUrl(debouncedQuery, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery, queryFromUrl]);

    useEffect(() => {
        let cancelled = false;

        const fetchFiles = async () => {
            setLoading(true);
            setError("");

            try {
                const params = new URLSearchParams();
                params.set("page", String(pageFromUrl));
                params.set("pageSize", String(PAGE_SIZE));
                params.set("sort", "newest");

                if (queryFromUrl.trim()) {
                    params.set("q", queryFromUrl.trim());
                }

                const res = await fetch(`/api/files?${params.toString()}`);
                const data = (await res.json().catch(() => ({}))) as FilesApiResponse;

                if (!res.ok) {
                    throw new Error("Gagal memuat hasil pencarian");
                }

                if (cancelled) return;

                setFiles(Array.isArray(data.files) ? data.files : []);
                setMeta({
                    total: Number(data.meta?.total ?? 0),
                    page: Number(data.meta?.page ?? 1),
                    pageSize: Number(data.meta?.pageSize ?? PAGE_SIZE),
                    totalPages: Math.max(1, Number(data.meta?.totalPages ?? 1)),
                });
            } catch (err) {
                if (cancelled) return;
                console.error("Gagal memuat hasil pencarian:", err);
                setFiles([]);
                setMeta({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 });
                setError("Hasil pencarian gagal dimuat. Coba lagi.");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchFiles();

        return () => {
            cancelled = true;
        };
    }, [pageFromUrl, queryFromUrl]);

    const hasQuery = queryFromUrl.trim().length > 0;
    const pageLabel = useMemo(
        () => `Halaman ${meta.page} dari ${meta.totalPages}`,
        [meta.page, meta.totalPages]
    );

    const handlePageChange = (nextPage: number) => {
        updateUrl(queryFromUrl, nextPage);
    };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ARSIP</span>
                <span>›</span>
                <span className="text-on-surface/70">PENCARIAN</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary mb-6">
                Pencarian
            </h1>

            <div className="relative max-w-lg mb-8">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface/40" />
                <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Cari berdasarkan judul, mata kuliah, tipe dokumen, atau penulis..."
                    className="w-full min-h-11 pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 rounded-md bg-surface-container-low text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus transition-shadow duration-150"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm text-on-surface/50">Memuat file...</p>
                </div>
            ) : (
                <>
                    {error && (
                        <p className="text-sm text-error mb-4">{error}</p>
                    )}

                    {hasQuery && (
                        <p className="text-sm text-on-surface/50 mb-4">
                            {meta.total} hasil untuk &ldquo;{queryFromUrl}&rdquo;
                        </p>
                    )}

                    {!hasQuery && (
                        <p className="text-sm text-on-surface/50 mb-4">
                            Menampilkan {meta.total} file terbaru.
                        </p>
                    )}

                    <FileGrid files={files} />

                    {meta.totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                            <button
                                onClick={() => handlePageChange(Math.max(1, meta.page - 1))}
                                disabled={meta.page <= 1}
                                className="min-h-11 px-4 py-2 text-sm rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Sebelumnya
                            </button>
                            <span className="text-sm sm:text-xs text-on-surface/50">
                                {pageLabel}
                            </span>
                            <button
                                onClick={() =>
                                    handlePageChange(Math.min(meta.totalPages, meta.page + 1))
                                }
                                disabled={meta.page >= meta.totalPages}
                                className="min-h-11 px-4 py-2 text-sm rounded-md bg-surface-container-low text-on-surface/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-sm text-on-surface/50">Memuat...</p>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}
