import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Mask NIM — show only last 3 digits: •••••028 */
export function formatNimMasked(nim: string): string {
    if (nim.length <= 3) return nim;
    return "•".repeat(nim.length - 3) + nim.slice(-3);
}

/** Format Unix timestamp (ms) to locale date string */
export function formatDate(timestampMs: number): string {
    return new Date(timestampMs).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/** Format Unix timestamp (ms) to relative time string */
export function formatRelativeTime(timestampMs: number): string {
    const now = Date.now();
    const diff = now - timestampMs;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return "Baru saja";
}

/** Get file extension label from MIME type */
export function getFileExtLabel(mimeType: string): string {
    const map: Record<string, string> = {
        "application/pdf": "PDF",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            "DOCX",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
            "PPTX",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            "XLSX",
        "text/plain": "TXT",
        "image/png": "PNG",
        "image/jpeg": "JPG",
        "application/zip": "ZIP",
    };
    return map[mimeType] ?? "FILE";
}

/** Calculate drive usage percentage */
export function driveUsagePercent(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
}
