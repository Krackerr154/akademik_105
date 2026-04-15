import { auth } from "@/lib/auth";
import { UsersPageClient } from "@/components/admin/users/UsersPageClient";

export default async function UsersPage() {
    const session = await auth();
    const user = session?.user as { role?: string } | undefined;
    const isSuperadmin = user?.role?.toLowerCase() === "superadmin";

    return <UsersPageClient isSuperadmin={isSuperadmin} />;
}
