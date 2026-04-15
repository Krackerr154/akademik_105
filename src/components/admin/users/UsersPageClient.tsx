"use client";

import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { AddAdminModal } from "@/components/admin/users/AddAdminModal";
import { Button } from "@/components/ui/Button";

interface User {
    id: string;
    name: string | null;
    email: string;
    nim: string | null;
    angkatan: string | null;
    role: string;
    status: string;
}

interface UsersPageClientProps {
    isSuperadmin: boolean;
}

export function UsersPageClient({ isSuperadmin }: UsersPageClientProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : data.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div>
            <div className="flex items-center gap-2 text-xs text-on-surface/50 font-sans mb-2"><span>ADMIN</span><span>›</span><span className="text-on-surface/70">MANAJEMEN PENGGUNA</span></div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display font-bold text-primary">Manajemen Pengguna</h1>
                {isSuperadmin && (
                    <Button onClick={() => setIsAddAdminModalOpen(true)}>
                        Tambah Admin
                    </Button>
                )}
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-on-surface/50 uppercase tracking-wide">
                                <th className="pb-3 pr-4">Nama</th>
                                <th className="pb-3 pr-4">Email</th>
                                <th className="pb-3 pr-4">NIM</th>
                                <th className="pb-3 pr-4">Angkatan</th>
                                <th className="pb-3 pr-4">Role</th>
                                <th className="pb-3 pr-4">Status</th>
                                <th className="pb-3">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="py-8 text-center text-on-surface/40">Memuat...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={7} className="py-8 text-center text-on-surface/40">Belum ada pengguna terdaftar.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="border-t border-on-surface/10">
                                        <td className="py-3 pr-4">{user.name || "-"}</td>
                                        <td className="py-3 pr-4">{user.email}</td>
                                        <td className="py-3 pr-4">{user.nim || "-"}</td>
                                        <td className="py-3 pr-4">{user.angkatan || "-"}</td>
                                        <td className="py-3 pr-4">{user.role}</td>
                                        <td className="py-3 pr-4">{user.status}</td>
                                        <td className="py-3">-</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isSuperadmin && (
                <AddAdminModal
                    isOpen={isAddAdminModalOpen}
                    onClose={() => setIsAddAdminModalOpen(false)}
                    onSuccess={() => {
                        setIsAddAdminModalOpen(false);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}
