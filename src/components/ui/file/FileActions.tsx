"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

// Recreate the minimal File structure we need
type FileData = {
    id: string;
    title: string;
    subject: string;
    tags: string | null;
    abstract: string | null;
    year: number | null;
    authors: string | null;
    visibility: string;
    uploaderId: string;
};

export function FileActions({
    file,
    currentUserId,
    isAdmin
}: {
    file: FileData;
    currentUserId: string;
    isAdmin: boolean;
}) {
    const router = useRouter();
    const canEdit = isAdmin || file.uploaderId === currentUserId;

    // Fallbacks incase of null
    const initialTags = (() => {
        try {
            return file.tags ? (JSON.parse(file.tags) as string[]) : [];
        } catch {
            return [];
        }
    })();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form state
    const [title, setTitle] = useState(file.title);
    const [subject, setSubject] = useState(file.subject);
    const [year, setYear] = useState(file.year ? String(file.year) : "");
    const [authors, setAuthors] = useState(file.authors || "");
    const [abstract, setAbstract] = useState(file.abstract || "");
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState("");
    const [visibility, setVisibility] = useState(file.visibility);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Tag helpers
    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
    };
    const removeTag = (tag: string) => { setTags(tags.filter((t) => t !== tag)); };

    const handleSave = async () => {
        if (!title.trim() || !subject.trim()) {
            setError("Judul dan Mata Kuliah wajib diisi.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/files/${file.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    subject: subject.trim(),
                    tags: tags.length > 0 ? JSON.stringify(tags) : null,
                    abstract: abstract.trim() || null,
                    year: year ? parseInt(year) : null,
                    authors: authors.trim() || null,
                    visibility: isAdmin ? visibility : undefined, // only admins can change visibility per route logic
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan perubahan");
            }

            setIsEditModalOpen(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-3">
                <a href={`/api/files/${file.id}/download`} target="_blank" rel="noreferrer">
                    <Button variant="primary">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Unduh File
                    </Button>
                </a>

                {canEdit && (
                    <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                        Edit Metadata
                    </Button>
                )}
            </div>

            {/* Edit Modal Backdrop */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
                            <h2 className="text-xl font-display font-medium text-on-surface">Edit Metadata</h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5">
                            {error && (
                                <div className="p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <Input
                                id="edit-title"
                                label="JUDUL"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    id="edit-subject"
                                    label="MATA KULIAH"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    required
                                />
                                <Input
                                    id="edit-year"
                                    label="TAHUN"
                                    type="number"
                                    mono
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                />
                            </div>

                            <Input
                                id="edit-authors"
                                label="PENULIS"
                                placeholder="Pisahkan dengan koma"
                                value={authors}
                                onChange={(e) => setAuthors(e.target.value)}
                            />

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-on-surface/60 uppercase tracking-wide">TAGS</label>
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                    {tags.map((tag) => (
                                        <Badge key={tag} variant="data" className="gap-1 flex items-center">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="text-on-secondary-container/60 hover:text-on-secondary-container ml-1 font-bold"
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
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addTag();
                                            }
                                        }}
                                        placeholder="Tambah tag dan tekan Enter..."
                                        className="flex-1 px-3 py-2 rounded-md bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus"
                                    />
                                    <Button type="button" variant="secondary" size="sm" onClick={addTag}>+ Tag</Button>
                                </div>
                            </div>

                            <Textarea
                                id="edit-abstract"
                                label="ABSTRAK"
                                value={abstract}
                                onChange={(e) => setAbstract(e.target.value)}
                                rows={4}
                            />

                            {isAdmin && (
                                <Select
                                    id="edit-visibility"
                                    label="VISIBILITAS (Admin Only)"
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value)}
                                    options={[
                                        { value: "members", label: "Publik (Member)" },
                                        { value: "admin_only", label: "Admin Only" }
                                    ]}
                                />
                            )}
                        </div>

                        <div className="p-6 border-t border-outline-variant/30 bg-surface-container-lowest flex justify-end gap-3 shrink-0">
                            <Button
                                variant="secondary"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={loading}
                            >
                                Batal
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                {loading ? "Menyimpan..." : "Simpan Perubahan"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    );
}
