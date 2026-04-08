"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useCallback } from "react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    className?: string;
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

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
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className={cn(
                    "relative z-10 w-full max-w-lg mx-4 bg-surface-container-lowest rounded-md shadow-ambient p-6 animate-in fade-in-0 zoom-in-95",
                    className
                )}
            >
                {title && (
                    <h2 className="text-lg font-semibold text-primary mb-4 font-display">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
}
