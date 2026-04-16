"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { normalizeKelompokCode, normalizeSubjectKey } from "@/types";

interface KelompokCardData {
    id?: string;
    code: string;
    name: string;
    description?: string | null;
    photoUrl?: string | null;
    cardStyle?: "rect" | "drive";
    isSystem?: boolean;
    isActive?: boolean;
    sortOrder?: number;
}

export default function MemberPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [kelompokCards, setKelompokCards] = useState<KelompokCardData[]>([]);

    useEffect(() => {
        const category = normalizeKelompokCode(String(searchParams.get("category") ?? ""));
        const subject = normalizeSubjectKey(String(searchParams.get("subject") ?? ""));

        if (!category) return;

        const next = subject
            ? `/folder/${category}?subject=${encodeURIComponent(subject)}`
            : `/folder/${category}`;
        router.replace(next);
    }, [router, searchParams]);

    useEffect(() => {
        let alive = true;

        const fetchKelompok = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/kelompok");
                if (!res.ok) return;

                const data = await res.json();
                const fetchedCards = Array.isArray(data.cards)
                    ? data.cards.map((c: Record<string, unknown>) => ({
                          id: String(c.id ?? ""),
                          code: String(c.code ?? ""),
                          name: String(c.name ?? ""),
                          description: c.description ? String(c.description) : null,
                          photoUrl: c.photoUrl ? String(c.photoUrl) : null,
                          cardStyle: c.cardStyle === "drive" ? "drive" : "rect",
                          isSystem: c.isSystem === 1 || c.isSystem === true,
                          isActive: c.isActive === 1 || c.isActive === true,
                          sortOrder: Number(c.sortOrder ?? 0),
                      }))
                    : [];

                if (alive) setKelompokCards(fetchedCards);
            } catch (err) {
                console.error("Gagal memuat kelompok:", err);
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchKelompok();

        return () => {
            alive = false;
        };
    }, []);

    const activeCards = useMemo(
        () =>
            [...kelompokCards]
                .filter((card) => card.isActive !== false)
                .sort(
                    (a, b) =>
                        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
                        a.code.localeCompare(b.code)
                ),
        [kelompokCards]
    );

    const rectCards = activeCards.filter(
        (card) => (card.cardStyle ?? "rect") !== "drive"
    );
    const driveCards = activeCards.filter(
        (card) => (card.cardStyle ?? "rect") === "drive"
    );

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">
                Repositori Akademik
            </h1>
            <p className="text-on-surface/60 text-sm mb-6 max-w-xl">
                Pilih kelompok keilmuan untuk membuka halaman mata kuliah khusus.
            </p>

            {loading ? (
                <Card>
                    <p className="text-sm text-on-surface/60">Memuat data kelompok...</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
                        {rectCards.map((card) => (
                            <button
                                key={card.code}
                                onClick={() => router.push(`/folder/${card.code}`)}
                                className="group text-left rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high transition-colors"
                            >
                                <div className="relative w-full aspect-[4/3] bg-surface-container-high">
                                    {card.photoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={card.photoUrl}
                                            alt={card.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-secondary/25 to-primary/15" />
                                    )}
                                </div>
                                <div className="p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-on-surface/60 font-mono mb-1">
                                        {card.code}
                                    </p>
                                    <h3 className="text-sm font-semibold text-primary line-clamp-2 mb-1">
                                        {card.name}
                                    </h3>
                                    <p className="text-xs text-on-surface/60 line-clamp-2">
                                        {card.description || "Kelompok keilmuan utama."}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {driveCards.length > 0 && (
                        <>
                            <h2 className="text-xs uppercase tracking-wider text-on-surface/50 font-mono mb-3">
                                Kelompok keilmuan lainnya
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                {driveCards.map((card) => (
                                    <button
                                        key={card.code}
                                        onClick={() => router.push(`/folder/${card.code}`)}
                                        className="group text-left p-4 rounded-md border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-high transition-colors"
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <DriveLikeIcon className="w-5 h-5 text-on-surface/40 mt-0.5" />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-semibold text-primary line-clamp-2 group-hover:underline decoration-secondary">
                                                    {card.name}
                                                </h3>
                                                <p className="text-[11px] font-mono text-on-surface/50 mt-1">
                                                    {card.code}
                                                </p>
                                            </div>
                                        </div>
                                        {card.description && (
                                            <p className="text-xs text-on-surface/55 line-clamp-2">
                                                {card.description}
                                            </p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function DriveLikeIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4.1a2 2 0 0 1 1.4.58l1.42 1.34A2 2 0 0 0 13.82 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
            <path d="M3 10h18" />
        </svg>
    );
}
