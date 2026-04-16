"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useCallback, useId } from "react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    const handleEsc = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [open, handleEsc]);

    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                className={cn(
                    "relative z-10 w-[calc(100vw-2rem)] sm:w-full max-w-lg bg-surface-container-lowest rounded-md shadow-ambient p-5 sm:p-6 max-h-[calc(100vh-2rem)] overflow-y-auto animate-in fade-in-0 zoom-in-95",
                    className
                )}
            >
                {title && (
                    <h2 id={titleId} className="text-lg font-semibold text-primary mb-4 font-display">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
}
