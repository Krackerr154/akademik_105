export default function SuspendedPage() {
    return (
        <main className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center"><span className="text-2xl">🔒</span></div>
                <h1 className="text-2xl font-display font-bold text-primary mb-3">Akun Ditangguhkan</h1>
                <p className="text-on-surface/60 text-sm mb-6 leading-relaxed">Akunmu telah ditangguhkan oleh admin. Akses ke arsip akademik tidak tersedia untuk sementara.</p>
                <p className="text-xs text-on-surface/40">Jika ada pertanyaan, hubungi admin AMISCA melalui WhatsApp.</p>
            </div>
        </main>
    );
}
