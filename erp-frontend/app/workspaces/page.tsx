import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Dashboard | ${APP_NAME}`,
    description: "Gestiona tus workspaces",
};
import { getWorkspaces } from "@/lib/workspace-actions";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { GlobalNav } from "@/components/global-nav";

export default async function DashboardIndexPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // Obtener workspaces
    const workspacesResult = await getWorkspaces();
    const workspaces = workspacesResult.data || [];

    // CASO 1: Usuario tiene uno o más workspaces
    // → Redirigir al último creado
    if (workspaces.length > 0) {
        // Ordenar por fecha de creación descendente (el más reciente primero)
        const sortedWorkspaces = [...workspaces].sort((a, b) => {
            const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
            const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
            return dateB - dateA;
        });
        
        redirect(`/workspaces/${sortedWorkspaces[0].slug}`);
    }

    // CASO 2: Usuario tiene 0 workspaces
    // → Mostrar onboarding de creación de workspace
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <GlobalNav />
            <main className="flex-1 pt-2 pb-12">
                <OnboardingCreateWorkspace
                    userName={session.user.first_name || ""}
                    userEmail={session.user.email || ""}
                />
            </main>
        </div>
    );
}

// Componente interno para onboarding cuando no hay workspaces
function OnboardingCreateWorkspace({
    userName,
    userEmail
}: {
    userName: string;
    userEmail: string;
}) {
    return (
        <WorkspaceSelector
            initialWorkspaces={[]}
            userName={userName}
            userEmail={userEmail}
        />
    );
}
