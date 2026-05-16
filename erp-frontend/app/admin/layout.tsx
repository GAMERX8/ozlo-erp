import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

// Marcar como dinámico porque usa auth() que depende de headers/cookies
export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "super_admin") {
        redirect("/workspaces");
    }

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader />
            <div className="flex h-screen pt-16">
                <AdminSidebar user={session.user} />
                <main className="flex-1 overflow-y-auto md:ml-64 bg-muted/10">
                    <div className="w-full max-w-7xl mx-auto p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
