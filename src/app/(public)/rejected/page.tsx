export default function RejectedPage() {
    return (
        <main className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center"><span className="text-2xl">✕</span></div>
                <h1 className="text-2xl font-display font-bold text-primary mb-3">Pendaftaran Ditolak</h1>
                <p className="text-on-surface/60 text-sm mb-6 leading-relaxed">Maaf, pendaftaranmu tidak disetujui. Ini bisa terjadi karena data NIM tidak valid atau tidak sesuai dengan kriteria keanggotaan HMK AMISCA ITB.</p>
                <p className="text-xs text-on-surface/40">Jika kamu merasa ini adalah kesalahan, hubungi admin AMISCA melalui WhatsApp.</p>
            </div>
        </main>
    );
}
