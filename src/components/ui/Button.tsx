import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary:
        "gradient-cta text-on-secondary hover:opacity-90 active:opacity-80",
    secondary:
        "bg-surface-container-high text-on-surface hover:bg-surface-container-highest active:bg-surface-container-highest/80",
    ghost:
        "bg-transparent text-primary hover:bg-surface-container-low active:bg-surface-container-high",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "min-h-11 px-4 py-2 text-sm",
    md: "min-h-11 px-5 py-2.5 text-sm",
    lg: "min-h-12 px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant = "primary", size = "md", disabled, ...props },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 disabled:opacity-50 disabled:pointer-events-none",
                    variantStyles[variant],
                    sizeStyles[size],
                    className
                )}
                disabled={disabled}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
