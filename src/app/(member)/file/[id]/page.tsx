import { Badge } from "@/components/ui/Badge";
import { getDb } from "@/lib/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FilePreview } from "@/components/ui/file/FilePreview";
import { FileActions } from "@/components/ui/file/FileActions";
import { auth } from "@/lib/auth";

export default async function FileDetailPage({ params }: { params: { id: string } }) {
    const fileId = params.id;
    const db = getDb();

    // Auth context
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    const currentUserId = user?.id || "";
    const isAdmin = user?.role === "admin" || user?.role === "superadmin";

    const fileRecord = await db.select().from(files).where(eq(files.id, fileId)).limit(1);

    if (fileRecord.length === 0) {
        return notFound();
    }

    const file = fileRecord[0];

    // Format size
    const sizeMb = (file.sizeBytes / (1024 * 1024)).toFixed(2);

    // Parse tags safely
    let parsedTags: string[] = [];
    try {
        if (file.tags) parsedTags = JSON.parse(file.tags);
    } catch { }

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-4">
                <span>JELAJAHI</span><span>›</span><span>MATA KULIAH</span><span>›</span>
                <span className="text-on-surface/70 uppercase">DETAIL FILE</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <h1 className="text-3xl font-display font-bold text-primary mb-6 leading-tight">{file.title}</h1>
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-6 mb-6">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">MATA KULIAH</p><Badge variant="subject">{file.subject || "–"}</Badge></div>
                            <div>
                                <p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TAGS</p>
                                <div className="flex gap-1 flex-wrap">
                                    {parsedTags.length > 0 ? parsedTags.map(tag => (
                                        <Badge key={tag} variant="data">{tag}</Badge>
                                    )) : <Badge variant="data">–</Badge>}
                                </div>
                            </div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">PENULIS</p><p className="text-sm text-on-surface">{file.authors || "–"}</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TAHUN</p><p className="text-sm text-on-surface font-mono">{file.year || "–"}</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">UKURAN FILE</p><p className="text-sm text-on-surface font-mono">{sizeMb} MB</p></div>
                            <div><p className="text-xs text-on-surface/50 uppercase tracking-wide mb-1">TANGGAL UNGGAH</p><p className="text-sm text-on-surface font-mono">{new Date(file.createdAt).toLocaleDateString("id-ID")}</p></div>
                        </div>
                    </div>
                    <div className="mb-6">
                        <p className="text-xs text-on-surface/50 uppercase tracking-wide mb-2">ABSTRAK</p>
                        <p className="text-sm text-on-surface/80 leading-relaxed whitespace-pre-wrap">{file.abstract || "Abstrak tidak tersedia untuk file ini."}</p>
                    </div>
                    <FileActions
                        file={file}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                    />
                </div>
                <div className="lg:col-span-2">
                    <FilePreview fileId={file.id} />
                </div>
            </div>
        </div>
    );
}
