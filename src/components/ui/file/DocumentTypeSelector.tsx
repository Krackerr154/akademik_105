"use client";

import { cn } from "@/lib/utils";
import { DocumentTypeOption, formatDocumentTypeLabel } from "@/types";

interface DocumentTypeSelectorProps {
    id: string;
    value: string;
    options: DocumentTypeOption[];
    onChange: (nextCode: string) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    showQuickPicks?: boolean;
    className?: string;
}

export function DocumentTypeSelector({
    id,
    value,
    options,
    onChange,
    label = "TIPE DOKUMEN",
    required,
    disabled,
    showQuickPicks = true,
    className,
}: DocumentTypeSelectorProps) {
    const activeOptions = options.filter((opt) => opt.isActive !== false);
    const quickPicks = activeOptions.slice(0, 6);

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label
                htmlFor={id}
                className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
            >
                {label}{required ? " *" : ""}
            </label>

            <select
                id={id}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md bg-surface-container-low text-on-surface transition-shadow duration-150 focus:outline-none ghost-border focus:ghost-border-focus appearance-none cursor-pointer disabled:opacity-60"
            >
                <option value="">Pilih tipe dokumen...</option>
                {activeOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                        {opt.label || formatDocumentTypeLabel(opt.code)}
                    </option>
                ))}
            </select>

            {showQuickPicks && quickPicks.length > 0 && (
                <div className="hidden md:flex flex-wrap gap-1.5 pt-1">
                    {quickPicks.map((opt) => {
                        const active = value === opt.code;
                        return (
                            <button
                                key={opt.code}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(opt.code)}
                                className={cn(
                                    "min-h-9 px-3 py-1.5 text-xs rounded-full border transition-colors",
                                    active
                                        ? "bg-secondary text-on-secondary border-secondary"
                                        : "bg-surface-container-lowest border-outline-variant/40 text-on-surface/70 hover:border-secondary/50 hover:text-secondary"
                                )}
                            >
                                {opt.label || formatDocumentTypeLabel(opt.code)}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
