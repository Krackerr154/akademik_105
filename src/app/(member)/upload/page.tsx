"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function UploadPage() {
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");

    const addTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
    };
    const removeTag = (tag: string) => { setTags(tags.filter((t) => t !== tag)); };

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ARSIP</span><span>›</span><span className="text-on-surface/70">UNGGAH DOKUMEN</span></div>
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Unggah Dokumen</h1>
            <p className="text-on-surface/60 text-sm mb-8 max-w-xl">Kontribusikan ke arsip kolektif. Pastikan metadata yang diisi akurat untuk kemudahan pencarian.</p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-8">
                        <div className="border-2 border-dashed border-outline-variant/30 rounded-md p-8 text-center hover:border-secondary/40 transition-colors cursor-pointer">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary/10 flex items-center justify-center"><UploadCloudIcon className="w-6 h-6 text-secondary" /></div>
                            <p className="text-sm text-on-surface/70 mb-1">Seret dan lepas file di sini, atau klik untuk memilih</p>
                            <p className="text-xs text-on-surface/40 font-mono">Format: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, ZIP</p>
                        </div>
                        <div className="mt-4 flex justify-center"><Button variant="secondary" size="sm">Pilih File</Button></div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <div className="bg-surface-container-lowest rounded-md shadow-ambient p-6 space-y-5">
                        <p className="text-xs text-on-surface/50 uppercase tracking-wider font-medium">Metadata Dokumen</p>
                        <Input id="title" label="JUDUL" placeholder="Catatan Kimia Organik 2 — Pertemuan 5" required />
                        <div className="grid grid-cols-2 gap-3">
                            <Input id="subject" label="MATA KULIAH" placeholder="Kimia Organik" required />
                            <Input id="year" label="TAHUN" placeholder="2024" mono type="number" />
                        </div>
                        <Input id="authors" label="PENULIS" placeholder="Dipisahkan dengan koma" />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-on-surface/60 uppercase tracking-wide">TAGS</label>
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {tags.map((tag) => (<Badge key={tag} variant="data" className="gap-1">{tag}<button onClick={() => removeTag(tag)} className="text-on-secondary-container/60 hover:text-on-secondary-container ml-0.5">×</button></Badge>))}
                            </div>
                            <div className="flex gap-2">
                                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Tambah tag..." className="flex-1 px-3 py-2 rounded-md bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none ghost-border focus:ghost-border-focus" />
                                <Button variant="secondary" size="sm" onClick={addTag}>+ Tag</Button>
                            </div>
                        </div>
                        <Textarea id="abstract" label="ABSTRAK" placeholder="Gambaran singkat isi dokumen..." rows={3} />
                        <div>
                            <label className="text-xs font-medium text-on-surface/60 uppercase tracking-wide mb-2 block">VISIBILITAS</label>
                            <div className="flex gap-2">
                                <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-on-secondary">Publik</button>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface-container-high text-on-surface/60">Privat</button>
                            </div>
                        </div>
                        <Button variant="primary" className="w-full mt-4">Unggah ke Arsip ✓</Button>
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
