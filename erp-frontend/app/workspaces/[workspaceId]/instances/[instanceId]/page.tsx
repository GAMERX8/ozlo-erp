import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { getInstance, getDokployData, getContainers } from "@/lib/actions";
import { InstanceDetailClient } from "@/components/dashboard/instance-detail-client";

// Deshabilitar el cacheo de la página - siempre fetch fresco
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface InstanceSettingsPageProps {
    params: Promise<{
        workspaceId: string;
        instanceId: string;
    }>;
}

export default async function InstanceSettingsPage({ params }: InstanceSettingsPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId, instanceId } = await params;
    
    // Get workspace
    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    if (!workspaceResult.data) notFound();

    // Get instance
    const instanceResult = await getInstance(instanceId);
    if (!instanceResult.data || instanceResult.error) notFound();

    // Get initial data for SSR
    const [dokployResult, containersResult] = await Promise.all([
        getDokployData(instanceId),
        getContainers(instanceId),
    ]);

    const containersList = Array.isArray(containersResult.data) ? containersResult.data : [];

    return (
        <InstanceDetailClient
            instance={instanceResult.data}
            workspace={workspaceResult.data}
            initialDokployData={dokployResult.data}
            initialContainers={containersList}
        />
    );
}
