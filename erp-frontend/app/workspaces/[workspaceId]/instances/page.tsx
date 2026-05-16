import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { getUserInstances } from "@/lib/actions";
import { InstancesList } from "@/components/instances/instances-list";
import { CreateInstanceButton } from "@/components/instances/create-instance-button";

interface InstancesPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: InstancesPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const result = await getWorkspaceBySlug(workspaceId);
    return {
        title: result.data ? `Instancias - ${result.data.name}` : "Instancias",
    };
}

export default async function InstancesPage({ params }: InstancesPageProps) {
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

    // Cargar instancias desde el servidor (SSR)
    const instancesResult = await getUserInstances(workspace.id);
    const instances = instancesResult.data || [];

    return (
        <div className="flex flex-col animate-in fade-in duration-500 pb-12 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Instancias</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gestiona tus asistentes de IA en <span className="font-medium">{workspace.name}</span>
                    </p>
                </div>
                <CreateInstanceButton 
                    workspaceId={workspace.id}  // UUID real para la API
                    workspaceSlug={workspaceId}  // slug para URLs
                />
            </div>

            {/* Instances List - Props desde SSR */}
            <InstancesList 
                workspaceId={workspace.id}      // UUID real
                workspaceSlug={workspaceId}     // slug
                instances={instances}           // Props desde SSR
            />
        </div>
    );
}
