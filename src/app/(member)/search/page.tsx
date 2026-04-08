"use client";

import { useState } from "react";
import { FileGrid } from "@/components/file/FileGrid";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const files: Parameters<typeof FileGrid>[0]["files"] = [];

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
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari berdasarkan judul, mata kuliah, tag, atau penulis..."
                    className="w-full pl-12 pr-4 py-3 rounded-md bg-surface-container-low text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus transition-shadow duration-150"
                />
            </div>

            {query && (
                <p className="text-sm text-on-surface/50 mb-4">
                    Menampilkan hasil untuk &ldquo;{query}&rdquo;
                </p>
            )}

            <FileGrid files={files} />
        </div>
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
