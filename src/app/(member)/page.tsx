"use client";

import { useState } from "react";
import { FileGrid } from "@/components/file/FileGrid";
import { Select } from "@/components/ui/Input";


export default function BrowsePage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [sort, setSort] = useState("newest");

    // Placeholder data — will be replaced with API fetch
    const files: Parameters<typeof FileGrid>[0]["files"] = [];

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
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Select
                        options={[
                            { value: "", label: "Semua Mata Kuliah" },
                            { value: "kimia-organik", label: "Kimia Organik" },
                            { value: "kimia-analitik", label: "Kimia Analitik" },
                            { value: "kimia-fisika", label: "Kimia Fisika" },
                        ]}
                        label="MATA KULIAH"
                        className="w-48"
                    />
                    <Select
                        options={[
                            { value: "", label: "Semua Tipe" },
                            { value: "application/pdf", label: "PDF" },
                            { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX" },
                            { value: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PPTX" },
                        ]}
                        label="FORMAT"
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
                            onClick={() => setView("grid")}
                            className={`p-1.5 rounded-sm transition-colors ${view === "grid"
                                ? "bg-surface-container-lowest text-secondary"
                                : "text-on-surface/40 hover:text-on-surface"
                                }`}
                        >
                            <GridIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView("list")}
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

            {/* File grid */}
            <FileGrid files={files} view={view} />

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-8">
                <span className="text-xs text-on-surface/50">Halaman 1</span>
            </div>
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
