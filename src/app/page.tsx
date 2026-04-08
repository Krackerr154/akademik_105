export default function HomePage() {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-md gradient-cta flex items-center justify-center">
                    <span className="text-on-secondary font-display font-bold text-2xl">
                        A
                    </span>
                </div>
                <h1 className="text-3xl font-display font-bold text-primary">
                    Akademik 105
                </h1>
                <p className="text-on-surface/60 max-w-md mx-auto">
                    Arsip akademik eksklusif untuk anggota HMK AMISCA ITB. Akses catatan
                    kuliah, soal ujian, dan referensi akademik.
                </p>
            </div>
        </main>
    );
}
