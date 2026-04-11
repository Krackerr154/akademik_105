"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { FileGrid } from "@/components/file/FileGrid";

interface FileData {
    id: string;
    title: string;
    subject: string;
    tags?: string | null;
    abstract?: string | null;
    authors?: string | null;
    mimeType: string;
    sizeBytes: number;
    createdAt: number;
}

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialQuery = searchParams.get("q") ?? "";
    const [query, setQuery] = useState(initialQuery);
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

    // Fuse.js fuzzy search instance
    const fuse = useMemo(() => {
        return new Fuse(files, {
            keys: ["title", "subject", "tags", "abstract", "authors"],
            threshold: 0.4,
            ignoreLocation: true,
        });
    }, [files]);

    // Search results
    const results = useMemo(() => {
        if (!query.trim()) return files;
        return fuse.search(query).map((r) => r.item);
    }, [query, fuse, files]);

    // Persist query to URL
    const handleQueryChange = (newQuery: string) => {
        setQuery(newQuery);
        const params = new URLSearchParams(searchParams.toString());
        if (newQuery.trim()) {
            params.set("q", newQuery);
        } else {
            params.delete("q");
        }
        router.replace(`/search?${params.toString()}`, { scroll: false });
    };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ARSIP</span>
                <span>›</span>
                <span className="text-on-surface/70">PENCARIAN</span>
            </div>

            <h1 className="text-3xl font-display font-bold text-primary mb-6">
                Pencarian
            </h1>

            <div className="relative max-w-lg mb-8">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface/40" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Cari berdasarkan judul, mata kuliah, tag, atau penulis..."
                    className="w-full pl-12 pr-4 py-3 rounded-md bg-surface-container-low text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus transition-shadow duration-150"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm text-on-surface/50">Memuat file...</p>
                </div>
            ) : (
                <>
                    {query && (
                        <p className="text-sm text-on-surface/50 mb-4">
                            {results.length} hasil untuk &ldquo;{query}&rdquo;
                        </p>
                    )}
                    <FileGrid files={results} />
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
