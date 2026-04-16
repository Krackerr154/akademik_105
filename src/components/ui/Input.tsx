import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

// ─── Text Input ────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    mono?: boolean;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, mono, error, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full px-3 py-2.5 rounded-md bg-surface-container-low text-on-surface placeholder:text-on-surface/40 transition-shadow duration-150 focus:outline-none ghost-border focus:ghost-border-focus",
                        mono && "font-mono text-sm",
                        error && "ring-1 ring-red-500/30",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

// ─── Textarea ──────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full px-3 py-2.5 rounded-md bg-surface-container-low text-on-surface placeholder:text-on-surface/40 transition-shadow duration-150 focus:outline-none ghost-border focus:ghost-border-focus resize-y min-h-[100px]",
                        error && "ring-1 ring-red-500/30",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";

// ─── Select ────────────────────────────────────────────────────────────

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
    error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, options, error, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={id}
                        className="text-[13px] font-medium text-on-surface/70 uppercase tracking-wide"
                    >
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full px-3 py-2.5 rounded-md bg-surface-container-low text-on-surface transition-shadow duration-150 focus:outline-none ghost-border focus:ghost-border-focus appearance-none cursor-pointer",
                        error && "ring-1 ring-red-500/30",
                        className
                    )}
                    {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="text-xs text-red-600">{error}</p>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";

export { Input, Textarea, Select };
