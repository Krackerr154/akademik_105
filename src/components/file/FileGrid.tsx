import { FileCard } from "@/components/file/FileCard";
import { cn } from "@/lib/utils";

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
}

interface FileGridProps {
    files: FileData[];
    view?: "grid" | "list";
    className?: string;
}

export function FileGrid({ files, view = "grid", className }: FileGridProps) {
    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
                    <EmptyIcon className="w-8 h-8 text-on-surface/30" />
                </div>
                <p className="text-on-surface/50 text-sm">
                    Belum ada file yang ditemukan.
                </p>
            </div>
        );
    }

    return (
        <div
            className={cn(
                view === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    : "flex flex-col gap-3",
                className
            )}
        >
            {files.map((file) => (
                <FileCard key={file.id} {...file} />
            ))}
        </div>
    );
}

function EmptyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
        </svg>
    );
}
