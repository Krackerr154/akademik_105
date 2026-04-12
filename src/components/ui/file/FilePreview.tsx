"use client";

import { useEffect, useState } from "react";

export function FilePreview({ fileId }: { fileId: string }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchPreview() {
            try {
                const res = await fetch(`/api/files/${fileId}/preview`);
                if (!res.ok) {
                    throw new Error("Gagal memuat pratinjau");
                }
                const data = await res.json();
                setPreviewUrl(data.url);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Terjadi kesalahan");
            } finally {
                setLoading(false);
            }
        }
        fetchPreview();
    }, [fileId]);

    if (loading) {
        return (
            <div className="bg-surface-container-low rounded-md aspect-[3/4] flex flex-col items-center justify-center gap-3">
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
            <div className="bg-surface-container-low rounded-md aspect-[3/4] flex items-center justify-center p-4 text-center">
                <p className="text-on-surface/50 text-sm">{error || "Pratinjau tidak tersedia"}</p>
            </div>
        );
    }

    // Google Drive webViewLink handles all file types inside an iframe seamlessly
    return (
        <div className="bg-surface-container-low rounded-md w-full h-[600px] lg:h-full lg:min-h-[500px] lg:aspect-[3/4] overflow-hidden flex items-center justify-center relative">
            <iframe
                src={previewUrl}
                className="w-full h-full border-0 absolute inset-0"
                allow="autoplay; fullscreen"
                title="File Preview"
            />
        </div>
    );
}
