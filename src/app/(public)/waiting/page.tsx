export default function WaitingPage() {
    return (
        <main className="min-h-screen bg-surface flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-tertiary-fixed-dim/20 flex items-center justify-center"><span className="text-2xl">⏳</span></div>
                <h1 className="text-2xl font-display font-bold text-primary mb-3">Menunggu Persetujuan</h1>
                <p className="text-on-surface/60 text-sm mb-6 leading-relaxed">Formulir pendaftaranmu sudah kami terima. Tim admin sedang meninjau data kamu. Proses ini biasanya membutuhkan waktu 1-2 hari kerja.</p>
                <p className="text-xs text-on-surface/40">Kamu akan mendapat notifikasi setelah akun disetujui.</p>
            </div>
        </main>
    );
}
