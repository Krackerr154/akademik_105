import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Akademik 105 — Arsip Akademik AMISCA ITB",
    description:
        "Platform arsip akademik eksklusif untuk anggota HMK AMISCA ITB. Akses catatan kuliah, soal ujian, dan referensi akademik.",
    keywords: ["AMISCA", "ITB", "Kimia", "arsip akademik", "catatan kuliah"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <body className="bg-surface text-on-surface antialiased">
                {children}
            </body>
        </html>
    );
}
