import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function FileDetailPage({ params }: { params: { id: string } }) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fileId = params.id;

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-4">
                <span>JELAJAHI</span><span>›</span><span>MATA KULIAH</span><span>›</span>
                <span className="text-on-surface/70 uppercase">DETAIL FILE</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <h1 className="text-3xl font-display font-bold text-primary mb-6 leading-tight">Detail Dokumen</h1>
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-6 mb-6">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">MATA KULIAH</p><Badge variant="subject">–</Badge></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TAGS</p><div className="flex gap-1"><Badge variant="data">–</Badge></div></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">PENULIS</p><p className="text-sm text-on-surface">–</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TAHUN</p><p className="text-sm text-on-surface font-mono">–</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">UKURAN FILE</p><p className="text-sm text-on-surface font-mono">–</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TANGGAL UNGGAH</p><p className="text-sm text-on-surface font-mono">–</p></div>
                        </div>
                    </div>
                    <div className="mb-6">
                        <p className="text-xs text-on-surface/50 uppercase tracking-wide mb-2">ABSTRAK</p>
                        <p className="text-sm text-on-surface/80 leading-relaxed">Deskripsi file akan ditampilkan di sini.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="primary"><DownloadIcon className="w-4 h-4" />Unduh File</Button>
                        <Button variant="secondary">Edit Metadata</Button>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="bg-surface-container-low rounded-md aspect-[3/4] flex items-center justify-center">
                        <p className="text-on-surface/30 text-sm">Pratinjau tidak tersedia</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}
