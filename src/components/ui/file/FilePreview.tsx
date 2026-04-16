"use client";

import { Button } from "@/components/ui/Button";
import { getFilePreviewMode } from "@/types";
import { useEffect, useMemo, useState } from "react";

const PREVIEW_CACHE_TTL_MS = 15 * 60 * 1000;

type CachedPreviewEntry = {
    url: string;
    expiresAt: number;
};

function getPreviewCacheKey(fileId: string): string {
    return `preview_url:${fileId}`;
}

function readCachedPreviewUrl(fileId: string): string | null {
    if (typeof window === "undefined") return null;

    const cacheKey = getPreviewCacheKey(fileId);

    try {
        const raw = window.sessionStorage.getItem(cacheKey);
        if (!raw) return null;

        const cached = JSON.parse(raw) as CachedPreviewEntry;
        if (!cached?.url || !cached.expiresAt || cached.expiresAt < Date.now()) {
            window.sessionStorage.removeItem(cacheKey);
            return null;
        }

        return cached.url;
    } catch {
        window.sessionStorage.removeItem(cacheKey);
        return null;
    }
}

function writeCachedPreviewUrl(fileId: string, url: string): void {
    if (typeof window === "undefined") return;

    const payload: CachedPreviewEntry = {
        url,
        expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    };

    window.sessionStorage.setItem(getPreviewCacheKey(fileId), JSON.stringify(payload));
}

function normalizePreviewError(rawMessage: string): string {
    const message = rawMessage.toLowerCase();

    if (message.includes("unauthorized") || message.includes("401")) {
        return "Sesi login berakhir. Silakan masuk ulang.";
    }
    if (message.includes("forbidden") || message.includes("403")) {
        return "Anda tidak memiliki izin untuk memuat pratinjau file ini.";
    }
    if (message.includes("tidak ditemukan") || message.includes("404")) {
        return "File tidak ditemukan atau sudah dipindahkan.";
    }

    return rawMessage || "Pratinjau sedang tidak tersedia. Coba lagi atau unduh file.";
}

function mapPreviewApiError(
    status: number,
    error: unknown,
    code: unknown
): string {
    const normalizedCode = typeof code === "string" ? code : "";

    if (normalizedCode === "UNAUTHORIZED") {
        return "Sesi login berakhir. Silakan masuk ulang.";
    }
    if (
        normalizedCode === "FORBIDDEN_INACTIVE" ||
        normalizedCode === "FORBIDDEN_VISIBILITY"
    ) {
        return "Anda tidak memiliki izin untuk memuat pratinjau file ini.";
    }
    if (normalizedCode === "FILE_NOT_FOUND") {
        return "File tidak ditemukan atau sudah dipindahkan.";
    }
    if (normalizedCode === "PREVIEW_URL_FAILED") {
        return "Server gagal menyiapkan pratinjau. Coba lagi sebentar.";
    }

    if (typeof error === "string" && error.length > 0) {
        return normalizePreviewError(error);
    }

    return `Gagal memuat pratinjau (${status}). Coba lagi atau unduh file.`;
}

interface FilePreviewProps {
    fileId: string;
    mimeType?: string | null;
    fileTitle?: string;
}

export function FilePreview({ fileId, mimeType, fileTitle }: FilePreviewProps) {
    const previewMode = useMemo(() => getFilePreviewMode(mimeType), [mimeType]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(previewMode === "inline");
    const [error, setError] = useState("");
    const [retryTick, setRetryTick] = useState(0);
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

    const downloadHref = `/api/files/${fileId}/download`;

    useEffect(() => {
        if (previewMode !== "inline") {
            setPreviewUrl(null);
            setError("");
            setLoading(false);
            setIsMobilePreviewOpen(false);
            return;
        }

        let cancelled = false;

        async function fetchPreview() {
            setLoading(true);
            setError("");

            const cachedUrl = readCachedPreviewUrl(fileId);
            if (cachedUrl) {
                setPreviewUrl(cachedUrl);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/files/${fileId}/preview`);
                const data = (await res.json().catch(() => ({}))) as {
                    url?: unknown;
                    error?: unknown;
                    code?: unknown;
                };

                if (!res.ok) {
                    throw new Error(
                        mapPreviewApiError(res.status, data.error, data.code)
                    );
                }

                if (typeof data.url !== "string" || data.url.length === 0) {
                    throw new Error("URL pratinjau tidak valid");
                }

                if (cancelled) return;

                setPreviewUrl(data.url);
                writeCachedPreviewUrl(fileId, data.url);
            } catch (err) {
                if (cancelled) return;

                const raw =
                    err instanceof Error
                        ? err.message
                        : "Terjadi kesalahan saat memuat pratinjau";
                setPreviewUrl(null);
                setError(normalizePreviewError(raw));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchPreview();

        return () => {
            cancelled = true;
        };
    }, [fileId, previewMode, retryTick]);

    useEffect(() => {
        if (!isMobilePreviewOpen) return;

        const previousOverflow = document.body.style.overflow;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsMobilePreviewOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isMobilePreviewOpen]);

    if (previewMode === "download_only") {
        return (
            <>
                <div className="hidden lg:flex bg-surface-container-low rounded-md aspect-[3/4] flex-col items-center justify-center p-6 text-center gap-3">
                    <p className="text-on-surface/60 text-sm">
                        Jenis file ini lebih aman dibuka lewat unduhan.
                    </p>
                    <a href={downloadHref} target="_blank" rel="noreferrer">
                        <Button variant="primary" size="sm">
                            Unduh File
                        </Button>
                    </a>
                </div>

                <div className="lg:hidden bg-surface-container-low rounded-md p-4 flex flex-col gap-3">
                    <p className="text-on-surface/70 text-sm">
                        Jenis file ini hanya tersedia dalam mode unduh.
                    </p>
                    <a href={downloadHref} target="_blank" rel="noreferrer">
                        <Button variant="primary" size="sm" className="w-full">
                            Unduh File
                        </Button>
                    </a>
                </div>
            </>
        );
    }

    const renderInlinePreview = (variant: "desktop" | "mobile") => {
        const panelClassName =
            variant === "desktop"
                ? "bg-surface-container-low rounded-md w-full h-[600px] lg:h-full lg:min-h-[500px] lg:aspect-[3/4] overflow-hidden flex items-center justify-center relative"
                : "bg-surface-container-low rounded-md w-full h-full min-h-0 overflow-hidden flex items-center justify-center relative";

        const fallbackClassName =
            variant === "desktop"
                ? "bg-surface-container-low rounded-md aspect-[3/4] flex flex-col items-center justify-center"
                : "bg-surface-container-low rounded-md w-full h-full min-h-0 flex flex-col items-center justify-center";

        if (loading) {
            return (
                <div className={`${fallbackClassName} gap-3`}>
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-on-surface/50 text-sm">Memuat pratinjau...</p>
                </div>
            );
        }

        if (error || !previewUrl) {
            return (
                <div className={`${fallbackClassName} p-6 text-center gap-4`}>
                    <p className="text-on-surface/60 text-sm">
                        {error || "Pratinjau tidak tersedia saat ini."}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => setRetryTick((prev) => prev + 1)}
                        >
                            Coba Lagi
                        </Button>
                        <a href={downloadHref} target="_blank" rel="noreferrer">
                            <Button variant="secondary" size="sm">
                                Unduh File
                            </Button>
                        </a>
                    </div>
                </div>
            );
        }

        return (
            <div className={panelClassName}>
                <iframe
                    src={previewUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    allow="autoplay; fullscreen"
                    title={fileTitle ? `Pratinjau ${fileTitle}` : "File Preview"}
                />
            </div>
        );
    };

    return (
        <>
            <div className="hidden lg:block">{renderInlinePreview("desktop")}</div>

            <div className="lg:hidden">
                {!isMobilePreviewOpen && (
                    <div className="bg-surface-container-low rounded-md p-4 flex flex-col gap-3">
                        <p className="text-on-surface/70 text-sm">
                            Mode pratinjau mobile tersedia dalam tampilan layar penuh.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                type="button"
                                onClick={() => setIsMobilePreviewOpen(true)}
                            >
                                Buka Pratinjau
                            </Button>
                            <a href={downloadHref} target="_blank" rel="noreferrer">
                                <Button variant="secondary" size="sm">
                                    Unduh File
                                </Button>
                            </a>
                        </div>
                    </div>
                )}

                {isMobilePreviewOpen && (
                    <div className="fixed inset-0 z-50 bg-surface-container-lowest flex flex-col">
                        <div
                            className="px-3 pb-3 border-b border-outline-variant/30 flex items-center justify-between gap-3"
                            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
                        >
                            <p className="text-sm font-medium text-on-surface truncate">
                                {fileTitle || "Pratinjau File"}
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => setIsMobilePreviewOpen(false)}
                            >
                                Tutup
                            </Button>
                        </div>

                        <div
                            className="flex-1 min-h-0 p-3"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
                        >
                            {renderInlinePreview("mobile")}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
