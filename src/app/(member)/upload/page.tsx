
"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, FILE_TYPE_LABELS } from "@/types";
import { formatBytes } from "@/lib/utils";
import { extractMetadataFromFilename, ExtractedMetadata } from "@/lib/metadata-extractor";
import pLimit from "p-limit";

// Icons 
import { UploadCloudIcon, FileCheckIcon, TrashIcon, AlertCircleIcon, FileIcon } from "lucide-react";

type UploadStatus = "idle" | "uploading" | "done" | "error";
type FlowStep = "SELECT" | "REVIEW" | "UPLOAD" | "DONE";

interface FileItem {
  id: string;
  file: File;
  metadata: ExtractedMetadata & { visibility: "members" | "admin_only"; subject: string; abstract: string; title: string; year: string; authors: string; tags: string[] };
  status: UploadStatus;
  progress: number;
  error?: string;
}

export default function BatchUploadPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<FlowStep>("SELECT");
    const [dragOver, setDragOver] = useState(false);
    const [filesQueue, setFilesQueue] = useState<FileItem[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);

    // Global "Apply to All" settings
    const [globalSubject, setGlobalSubject] = useState("");
    const [globalYear, setGlobalYear] = useState("");
    const [globalVisibility, setGlobalVisibility] = useState<"members" | "admin_only">("members");

    // Helpers
    const validateFile = (file: File): string | null => {
        if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
            return `Tipe file tidak didukung: ${file.type}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return `Ukuran file terlalu besar (${formatBytes(file.size)}). Maksimum ${formatBytes(MAX_FILE_SIZE)}.`;
        }
        return null;
    };

    const handleFilesSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        const newItems: FileItem[] = [];
        Array.from(files).forEach((file) => {
            const err = validateFile(file);
            if (err) {
                console.warn(`File skipped: ${file.name} - ${err}`);
                return;
            }

            const extracted = extractMetadataFromFilename(file.name);
            newItems.push({
                id: crypto.randomUUID(),
                file,
                metadata: {
                    ...extracted,
                    visibility: "members",
                    abstract: "",
                },
                status: "idle",
                progress: 0,
            });
        });

        if (newItems.length > 0) {
            setFilesQueue((prev) => [...prev, ...newItems]);
            setStep("REVIEW");
        }
    };

    // Drag and drop
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);
    const handleDragLeave = useCallback(() => setDragOver(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFilesSelect(e.dataTransfer.files);
    }, []);

    // SHA-256 hash calculation
    const computeSha256 = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    // Upload Execution
    const startBatchUpload = async () => {
        setStep("UPLOAD");
        const limit = pLimit(2);
        let completed = 0;
        
        const uploadTasks = filesQueue.map((item, index) => limit(async () => {
            const updateItemStatus = (updates: Partial<FileItem>) => {
                setFilesQueue(prev => {
                    const newQ = [...prev];
                    // Defensive check
                    if (newQ[index]) {
                        newQ[index] = { ...newQ[index], ...updates };
                    }
                    return newQ;
                });
            };

            try {
                updateItemStatus({ status: "uploading", progress: 10 });
                const { file, metadata } = item;

                // Step 1: Init
                const initRes = await fetch("/api/upload/init", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                    }),
                });

                if (!initRes.ok) {
                    const data = await initRes.json();
                    throw new Error(data.error ?? "Gagal menginisialisasi upload");
                }

                const { driveId, uploadUri } = await initRes.json();
                updateItemStatus({ progress: 20 });

                // Step 2: Upload to Drive
                const uploadRes = await fetch(uploadUri, {
                    method: "PUT",
                    headers: { "Content-Type": file.type },
                    body: file,
                });

                if (!uploadRes.ok) {
                    throw new Error(`Upload gagal: ${uploadRes.status}`);
                }

                const driveData = await uploadRes.json();
                const gdriveFileId = driveData.id;
                if (!gdriveFileId) throw new Error("Google Drive tidak mengembalikan ID file");

                updateItemStatus({ progress: 70 });

                // Step 3: Calculate SHA-256
                const sha256 = await computeSha256(file);
                updateItemStatus({ progress: 85 });

                // Step 4: Complete DB
                const completeRes = await fetch("/api/upload/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        driveId,
                        gdriveFileId,
                        title: metadata.title.trim(),
                        subject: metadata.subject.trim(),
                        tags: metadata.tags.length > 0 ? JSON.stringify(metadata.tags) : null,
                        abstract: metadata.abstract.trim() || null,
                        year: metadata.year ? parseInt(metadata.year) : null,
                        authors: metadata.authors.trim() || null,
                        mimeType: file.type,
                        sizeBytes: file.size,
                        sha256,
                        visibility: metadata.visibility,
                    }),
                });

                if (!completeRes.ok) {
                    const data = await completeRes.json();
                    throw new Error(data.error ?? "Gagal menyimpan metadata");
                }

                updateItemStatus({ status: "done", progress: 100 });
            } catch (error) {
                updateItemStatus({ 
                    status: "error", 
                    error: error instanceof Error ? error.message : "Kesalahan yang tidak diketahui" 
                });
            } finally {
                completed++;
                setOverallProgress(Math.round((completed / filesQueue.length) * 100));
            }
        }));

        await Promise.all(uploadTasks);
        setStep("DONE");
    };

    const applyGlobalSettings = () => {
        setFilesQueue(q => q.map(item => ({
            ...item,
            metadata: {
                ...item.metadata,
                subject: globalSubject || item.metadata.subject,
                year: globalYear || item.metadata.year,
                visibility: globalVisibility || item.metadata.visibility,
            }
        })));
        setGlobalSubject("");
        setGlobalYear("");
    };

    const setItemMetadata = (index: number, key: keyof FileItem["metadata"], value: any) => {
        setFilesQueue(q => {
            const newQ = [...q];
            newQ[index].metadata = { ...newQ[index].metadata, [key]: value };
            return newQ;
        });
    };

    const setItemTagsStr = (index: number, tagsStr: string) => {
        const tagsBox = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
        setItemMetadata(index, "tags", tagsBox);
    };

    const removeItem = (index: number) => {
        setFilesQueue(q => {
            const result = q.filter((_, i) => i !== index);
            if (result.length === 0) setStep("SELECT");
            return result;
        });
    };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ARSIP</span><span>›</span>
                <span className="text-on-surface/70">BATCH UPLOAD</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Unggah Dokumen (Batch)</h1>
            <p className="text-on-surface/60 text-sm mb-8 max-w-xl">
                Unggah banyak file sekaligus. Sistem otomatis menebak judul, mata kuliah, dan tahun berdasarkan pola penamaan judul (misal: [UJIAN 1] KUGU 2021.pdf).
            </p>

            {/* STEP 1: SELECT FILES */}
            {step === "SELECT" && (
                <div className="bg-surface-container-lowest rounded-md shadow-ambient p-8 text-center border-2 border-dashed border-outline-variant/30 hover:border-secondary/40 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept={ALLOWED_MIME_TYPES.join(",")}
                        onChange={(e) => handleFilesSelect(e.target.files)}
                    />
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 flex items-center justify-center">
                        <UploadCloudIcon className="w-8 h-8 text-secondary" />
                    </div>
                    <p className="text-lg font-medium text-on-surface mb-2">Seret dan lepas banyak file di sini</p>
                    <p className="text-sm text-on-surface/60 mb-6">atau klik untuk memilih dari komputer Anda</p>
                </div>
            )}

            {/* STEP 2: REVIEW / PREVIEW */}
            {step === "REVIEW" && (
                <div className="space-y-6">
                    <div className="flex flex-wrap justify-between items-center bg-surface-container-low p-4 rounded-md shadow-sm gap-4">
                        <h3 className="font-semibold text-lg text-primary">Tinjau Metadata ({filesQueue.length} file)</h3>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept={ALLOWED_MIME_TYPES.join(",")}
                                onChange={(e) => handleFilesSelect(e.target.files)}
                            />
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Tambah File</Button>
                            <Button onClick={startBatchUpload}>Mulai Upload</Button>
                        </div>
                    </div>

                    <div className="bg-secondary/5 p-4 rounded-md border border-secondary/20 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Input 
                                id="global-sub" label="MATA KULIAH (Semua)" 
                                value={globalSubject} onChange={e => setGlobalSubject(e.target.value)} 
                            />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                            <Input 
                                id="global-year" label="TAHUN (Semua)" 
                                value={globalYear} onChange={e => setGlobalYear(e.target.value)} 
                            />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                            <p className="text-xs text-on-surface/60 mb-2">VISIBILITAS (Semua)</p>
                            <select 
                                className="w-full bg-surface text-on-surface p-2 rounded border border-outline/30"
                                value={globalVisibility} 
                                onChange={e => setGlobalVisibility(e.target.value as any)}
                            >
                                <option value="members">Anggota</option>
                                <option value="admin_only">Hanya Admin</option>
                            </select>
                        </div>
                        <Button variant="secondary" onClick={applyGlobalSettings}>Terapkan</Button>
                    </div>

                    <div className="grid gap-4">
                        {filesQueue.map((item, i) => (
                            <div key={item.id} className="bg-surface-container-lowest p-5 rounded-md shadow-sm border border-outline-variant/30 flex flex-col md:flex-row gap-6">
                                <div className="flex flex-col gap-2 md:w-1/3 border-r border-outline-variant/30 pr-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden" title={item.file.name}>
                                            <FileIcon className="w-5 h-5 text-secondary shrink-0" />
                                            <span className="font-medium text-sm truncate block">{item.file.name}</span>
                                        </div>
                                        <button onClick={() => removeItem(i)} className="text-error/70 hover:text-error shrink-0">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="text-xs text-on-surface/50 font-mono">
                                        {formatBytes(item.file.size)} • {FILE_TYPE_LABELS[item.file.type] || "FILE"}
                                    </div>
                                    <div className="mt-2 text-xs">
                                        <label className="text-on-surface/60">Privasi:</label>
                                        <select className="ml-2 bg-transparent text-primary outline-none" value={item.metadata.visibility} onChange={e => setItemMetadata(i, "visibility", e.target.value)}>
                                            <option value="members">Semua Anggota</option>
                                            <option value="admin_only">Hanya Admin</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <Input
                                            id={`title-${i}`} label="JUDUL"
                                            value={item.metadata.title} onChange={e => setItemMetadata(i, "title", e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        id={`subject-${i}`} label="KODE / MATKUL"
                                        value={item.metadata.subject} onChange={e => setItemMetadata(i, "subject", e.target.value)}
                                    />
                                    <Input
                                        id={`year-${i}`} label="TAHUN"
                                        value={item.metadata.year} onChange={e => setItemMetadata(i, "year", e.target.value)}
                                    />
                                    <div className="md:col-span-2 text-xs">
                                        <p className="text-on-surface/60 mb-1">TAG (Pisahkan dengan koma)</p>
                                        <input 
                                            className="w-full bg-surface text-on-surface px-3 py-2 rounded border border-outline/30"
                                            value={item.metadata.tags.join(", ")}
                                            onChange={e => setItemTagsStr(i, e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 3 & 4: UPLOAD / DONE */}
            {(step === "UPLOAD" || step === "DONE") && (
                <div className="space-y-6 max-w-4xl mx-auto mt-6">
                    <div className="bg-surface-container-lowest p-6 rounded-md shadow-ambient text-center">
                        <h2 className="text-xl font-semibold mb-2">
                            {step === "DONE" ? "Upload Selesai!" : "Sedang Mengunggah..."}
                        </h2>
                        <div className="w-full bg-surface-container-high rounded-full h-3 mb-2 overflow-hidden">
                            <div 
                                className={`bg-secondary h-3 transition-all duration-300`} 
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                        <p className="text-sm text-on-surface/60">{overallProgress}% Selesai</p>
                        
                        {step === "DONE" && (
                            <Button className="mt-6" onClick={() => router.push("/")}>Kembali ke Arsip</Button>
                        )}
                    </div>

                    <div className="grid gap-3">
                        {filesQueue.map((item) => (
                            <div key={item.id} className="bg-surface-container-lowest p-4 rounded-md shadow-sm border border-outline-variant/30 flex items-center justify-between">
                                <div className="flex items-center gap-3 w-1/2 overflow-hidden">
                                    {item.status === "done" ? <FileCheckIcon className="w-5 h-5 text-emerald-500 shrink-0" /> :
                                     item.status === "error" ? <AlertCircleIcon className="w-5 h-5 text-error shrink-0" /> :
                                     <UploadCloudIcon className="w-5 h-5 text-secondary animate-pulse shrink-0" />}
                                    <span className="font-medium text-sm truncate block">{item.metadata.title}</span>
                                </div>
                                <div className="w-1/3 text-right">
                                    {item.status === "error" ? (
                                        <span className="text-xs text-error truncate" title={item.error}>{item.error}</span>
                                    ) : item.status === "done" ? (
                                        <span className="text-xs font-bold text-emerald-500">Berhasil</span>
                                    ) : (
                                        <div className="w-full bg-surface-container-high rounded-full h-1.5 inline-block">
                                            <div 
                                                className={`h-1.5 rounded-full transition-all duration-300 bg-secondary`} 
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


