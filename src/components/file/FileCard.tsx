import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { formatBytes, formatDate, getFileExtLabel } from "@/lib/utils";
import { formatDocumentTypeLabel, normalizeDocumentTypeCode } from "@/types";

interface FileCardProps {
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
    className?: string;
}

export function FileCard({
    id,
    title,
    subject,
    docType,
    tags,
    mimeType,
    sizeBytes,
    createdAt,
    uploaderName,
    uploaderAvatar,
    className,
}: FileCardProps) {
    const resolvedDocType = (() => {
        if (docType) {
            return normalizeDocumentTypeCode(docType);
        }

        try {
            const parsed = tags ? (JSON.parse(tags) as string[]) : [];
            if (parsed.length > 0) {
                return normalizeDocumentTypeCode(parsed[0]);
            }
        } catch {
            // Ignore malformed legacy tag JSON and fallback to OTHER.
        }

        return "OTHER";
    })();

    const docTypeLabel = formatDocumentTypeLabel(resolvedDocType);
    const fileExt = getFileExtLabel(mimeType);

    return (
        <a
            href={`/file/${id}`}
            className={cn(
                "block bg-surface-container-lowest rounded-md shadow-ambient p-5 transition-colors duration-150 hover:bg-surface-container-highest group",
                className
            )}
        >
            {/* Top row: file icon + subject badge */}
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-md bg-secondary/10 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant="subject">{subject}</Badge>
                    <Badge variant="data">{docTypeLabel}</Badge>
                </div>
            </div>

            {/* Title */}
            <h3 className="font-display font-semibold text-primary text-sm leading-tight mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
                {title}
            </h3>

            {/* Meta row: file ext + size + date */}
            <div className="flex items-center gap-3 text-xs text-on-surface/50 font-mono mb-3">
                <Badge variant="data">{fileExt}</Badge>
                <span>{formatBytes(sizeBytes)}</span>
                <span>{formatDate(createdAt)}</span>
            </div>

            {/* Uploader */}
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden">
                    {uploaderAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={uploaderAvatar}
                            alt={uploaderName ?? ""}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-[10px] font-medium text-on-surface/50">
                            {uploaderName?.charAt(0)?.toUpperCase() ?? "U"}
                        </span>
                    )}
                </div>
                <span className="text-xs text-on-surface/60">{uploaderName ?? "Pengguna"}</span>
            </div>
        </a>
    );
}

function FileIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    );
}
