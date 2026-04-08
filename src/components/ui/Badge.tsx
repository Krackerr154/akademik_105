import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "data" | "flag-green" | "flag-yellow" | "flag-red" | "subject";

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default:
        "bg-surface-container-high text-on-surface",
    data:
        "bg-secondary-container text-on-secondary-container font-mono text-xs",
    "flag-green":
        "bg-secondary-container text-on-secondary-container",
    "flag-yellow":
        "bg-tertiary-fixed-dim/20 text-on-surface",
    "flag-red":
        "bg-red-100 text-red-800",
    subject:
        "bg-secondary/10 text-secondary font-medium",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium leading-tight whitespace-nowrap",
                variantStyles[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
