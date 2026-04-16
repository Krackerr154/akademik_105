import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function RegisterPage() {
    const gformUrl = process.env.NEXT_PUBLIC_GFORM_URL ?? "#";
    return (
        <main className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-md gradient-cta flex items-center justify-center"><span className="text-on-secondary font-display font-bold text-2xl">A</span></div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-primary mb-3">Selamat Datang di Akademik 105</h1>
                <p className="text-on-surface/60 text-sm mb-6 leading-relaxed">Untuk mengakses arsip akademik AMISCA ITB, kamu perlu mengisi{" "}<strong>Form Pendataan Anggota</strong> terlebih dahulu. Setelah diisi, kembali ke halaman ini dan login dengan akun Google yang sama.</p>
                <div className="space-y-3">
                    <a href={gformUrl} target="_blank" rel="noopener noreferrer"><Button variant="primary" size="lg" className="w-full">Isi Form Pendataan Anggota</Button></a>
                    <Link href="/auth/signin"><Button variant="ghost" size="md" className="w-full mt-2">Sudah mengisi form? Login di sini</Button></Link>
                </div>
                <p className="text-xs text-on-surface/40 mt-8">HMK AMISCA ITB — Divisi Akademik</p>
            </div>
        </main>
    );
}
