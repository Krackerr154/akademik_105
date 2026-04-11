"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, FILE_TYPE_LABELS } from "@/types";
import { formatBytes } from "@/lib/utils";

type UploadStep = "idle" | "uploading" | "completing" | "done" | "error";

export default function UploadPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);

    // Metadata state
    const [title, setTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [year, setYear] = useState("");
    const [authors, setAuthors] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [abstract, setAbstract] = useState("");
    const [visibility, setVisibility] = useState<"members" | "admin_only">("members");

    // Upload state
    const [step, setStep] = useState<UploadStep>("idle");
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    // Tag helpers
    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
    };
    const removeTag = (tag: string) => { setTags(tags.filter((t) => t !== tag)); };

    // File validation
    const validateFile = (file: File): string | null => {
        if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
            return `Tipe file tidak didukung: ${file.type}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return `Ukuran file terlalu besar (${formatBytes(file.size)}). Maksimum ${formatBytes(MAX_FILE_SIZE)}.`;
        }
        return null;
    };

    // File selection handler
    const handleFileSelect = (file: File) => {
        const err = validateFile(file);
        if (err) {
            setErrorMsg(err);
            return;
        }
        setSelectedFile(file);
        setErrorMsg("");
        // Auto-fill title from filename if empty
        if (!title) {
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            setTitle(nameWithoutExt);
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
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title]);

    // SHA-256 hash calculation
    const computeSha256 = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    // Upload flow
    const handleUpload = async () => {
        if (!selectedFile || !title.trim() || !subject.trim()) {
            setErrorMsg("File, judul, dan mata kuliah wajib diisi.");
            return;
        }

        setStep("uploading");
        setErrorMsg("");
        setProgress(0);

        try {
            // Step 1: Init upload — get resumable URI from server
            const initRes = await fetch("/api/upload/init", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: selectedFile.name,
                    mimeType: selectedFile.type,
                    fileSize: selectedFile.size,
                }),
            });

            if (!initRes.ok) {
                const data = await initRes.json();
                throw new Error(data.error ?? "Gagal menginisialisasi upload");
            }

            const { driveId, uploadUri } = await initRes.json();
            setProgress(20);

            // Step 2: Upload file to Google Drive via resumable URI
            const uploadRes = await fetch(uploadUri, {
                method: "PUT",
                headers: {
                    "Content-Type": selectedFile.type,
                },
                body: selectedFile,
            });

            if (!uploadRes.ok) {
                throw new Error(`Upload ke Google Drive gagal: ${uploadRes.status}`);
            }

            const driveData = await uploadRes.json();
            const gdriveFileId = driveData.id;
            if (!gdriveFileId) {
                throw new Error("Google Drive tidak mengembalikan ID file");
            }

            setProgress(70);
            setStep("completing");

            // Step 3: Calculate SHA-256
            const sha256 = await computeSha256(selectedFile);
            setProgress(85);

            // Step 4: Complete — save metadata to DB
            const completeRes = await fetch("/api/upload/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    driveId,
                    gdriveFileId,
                    title: title.trim(),
                    subject: subject.trim(),
                    tags: tags.length > 0 ? JSON.stringify(tags) : null,
                    abstract: abstract.trim() || null,
                    year: year ? parseInt(year) : null,
                    authors: authors.trim() || null,
                    mimeType: selectedFile.type,
                    sizeBytes: selectedFile.size,
                    sha256,
                    visibility,
                }),
            });

            if (!completeRes.ok) {
                const data = await completeRes.json();
                throw new Error(data.error ?? "Gagal menyimpan metadata");
            }

            setProgress(100);
            setStep("done");

            // Redirect to browse after short delay
            setTimeout(() => router.push("/"), 2000);
        } catch (err) {
            setStep("error");
            setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat upload");
        }
    };

    const isUploading = step === "uploading" || step === "completing";
    const fileTypeLabel = selectedFile ? (FILE_TYPE_LABELS[selectedFile.type] ?? "FILE") : "";

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2">
                <span>ARSIP</span><span>›</span>
                <span className="text-on-surface/70">UNGGAH DOKUMEN</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Unggah Dokumen</h1>
            <p className="text-on-surface/60 text-sm mb-8 max-w-xl">
                Kontribusikan ke arsip kolektif. Pastikan metadata yang diisi akurat untuk kemudahan pencarian.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left: File drop zone */}
                <div className="lg:col-span-3">
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-8">
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={ALLOWED_MIME_TYPES.join(",")}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />

                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${dragOver
                                ? "border-secondary bg-secondary/5"
                                : selectedFile
                                    ? "border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-900/10"
                                    : "border-outline-variant/30 hover:border-secondary/40"
                                }`}
                        >
                            {selectedFile ? (
                                <>
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                        <FileCheckIcon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-medium text-on-surface mb-1">{selectedFile.name}</p>
                                    <p className="text-xs text-on-surface/50 font-mono">
                                        {fileTypeLabel} · {formatBytes(selectedFile.size)}
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="mt-3 text-xs text-red-500 hover:text-red-600 underline"
                                    >
                                        Hapus file
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary/10 flex items-center justify-center">
                                        <UploadCloudIcon className="w-6 h-6 text-secondary" />
                                    </div>
                                    <p className="text-sm text-on-surface/70 mb-1">
                                        Seret dan lepas file di sini, atau klik untuk memilih
                                    </p>
                                    <p className="text-xs text-on-surface/40 font-mono">
                                        Format: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, ZIP
                                    </p>
                                </>
                            )}
                        </div>

                        {!selectedFile && (
                            <div className="mt-4 flex justify-center">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Pilih File
                                </Button>
                            </div>
                        )}

                        {/* Upload progress */}
                        {isUploading && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between text-xs text-on-surface/60 mb-2">
                                    <span>{step === "uploading" ? "Mengunggah ke Drive..." : "Menyimpan metadata..."}</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-secondary rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Success message */}
                        {step === "done" && (
                            <div className="mt-6 px-4 py-3 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm">
                                ✅ File berhasil diunggah! Mengalihkan ke halaman utama...
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Metadata form */}
                <div className="lg:col-span-2">
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-6 space-y-5">
                        <p className="text-xs text-on-surface/50 uppercase tracking-wider font-medium">Metadata Dokumen</p>

                        <Input
                            id="title"
                            label="JUDUL"
                            placeholder="Catatan Kimia Organik 2 — Pertemuan 5"
                            required
                            value={title}
                            onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                id="subject"
                                label="MATA KULIAH"
                                placeholder="Kimia Organik"
                                required
                                value={subject}
                                onChange={(e) => setSubject((e.target as HTMLInputElement).value)}
                            />
                            <Input
                                id="year"
                                label="TAHUN"
                                placeholder="2024"
                                mono
                                type="number"
                                value={year}
                                onChange={(e) => setYear((e.target as HTMLInputElement).value)}
                            />
                        </div>

                        <Input
                            id="authors"
                            label="PENULIS"
                            placeholder="Dipisahkan dengan koma"
                            value={authors}
                            onChange={(e) => setAuthors((e.target as HTMLInputElement).value)}
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-on-surface/60 uppercase tracking-wide">TAGS</label>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="data" className="gap-1">
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="text-on-secondary-container/60 hover:text-on-secondary-container ml-0.5"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                                    placeholder="Tambah tag..."
                                    className="flex-1 px-3 py-2 rounded-md bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus"
                                />
                                <Button variant="secondary" size="sm" onClick={addTag}>+ Tag</Button>
                            </div>
                        </div>

                        <Textarea
                            id="abstract"
                            label="ABSTRAK"
                            placeholder="Gambaran singkat isi dokumen..."
                            rows={3}
                            value={abstract}
                            onChange={(e) => setAbstract((e.target as HTMLTextAreaElement).value)}
                        />

                        <div>
                            <label className="text-xs font-medium text-on-surface/60 uppercase tracking-wide mb-2 block">VISIBILITAS</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setVisibility("members")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${visibility === "members"
                                        ? "bg-secondary text-on-secondary"
                                        : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
                                        }`}
                                >
                                    Publik
                                </button>
                                <button
                                    onClick={() => setVisibility("admin_only")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${visibility === "admin_only"
                                        ? "bg-secondary text-on-secondary"
                                        : "bg-surface-container-high text-on-surface/60 hover:text-on-surface"
                                        }`}
                                >
                                    Admin Only
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {errorMsg && (
                            <div className="px-4 py-3 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
                                {errorMsg}
                            </div>
                        )}

                        <Button
                            variant="primary"
                            className="w-full mt-4"
                            onClick={handleUpload}
                            disabled={!selectedFile || !title.trim() || !subject.trim() || isUploading || step === "done"}
                        >
                            {isUploading ? "Mengunggah..." : step === "done" ? "Berhasil ✓" : "Unggah ke Arsip ✓"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UploadCloudIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
    );
}

function FileCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <polyline points="9 15 11 17 15 13" />
        </svg>
    );
}
