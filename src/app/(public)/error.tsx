"use client";

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-display font-bold text-on-surface mb-2">
                Terjadi Kesalahan
            </h2>
            <p className="text-sm text-on-surface/60 mb-6 max-w-md text-center">
                {error.message || "Halaman tidak dapat dimuat. Silakan coba lagi."}
            </p>
            <button
                onClick={reset}
                className="min-h-11 px-6 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-colors"
            >
                Coba Lagi
            </button>
        </div>
    );
}
