"use client";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">PENGATURAN SISTEM</span></div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary mb-6">Pengaturan Sistem</h1>
            <div className="space-y-6 max-w-xl">
                <Card>
                    <h2 className="text-lg font-display font-semibold text-primary mb-4">Google Form Sync</h2>
                    <div className="space-y-4">
                        <Input id="sheet_id" label="SHEET ID" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" mono />
                        <Input id="sheet_tab" label="NAMA TAB" placeholder="Form Responses 1" />
                    </div>
                </Card>
                <Card>
                    <h2 className="text-lg font-display font-semibold text-primary mb-4">Kontak Admin</h2>
                    <div className="space-y-4">
                        <Input id="admin_wa" label="WHATSAPP ADMIN" placeholder="+62xxx" mono />
                    </div>
                </Card>
                <Button variant="primary" className="w-full sm:w-auto">Simpan Pengaturan</Button>
            </div>
        </div>
    );
}
