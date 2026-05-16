import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { WorkspaceSettings } from "@/components/dashboard/workspace-settings";

interface SettingsPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const result = await getWorkspaceBySlug(workspaceId);
    return {
        title: result.data ? `Configuración - ${result.data.name}` : "Configuración",
    };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (workspaceResult.error || !workspaceResult.data) {
        notFound();
    }

    const workspace = workspaceResult.data;

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Administra la configuración de <span className="font-medium">{workspace.name}</span>
                    </p>
                </div>
            </div>

            {/* Settings */}
            <WorkspaceSettings
                workspace={workspace}
                currentUserId={session.user.id}
            />
        </div>
    );
}
