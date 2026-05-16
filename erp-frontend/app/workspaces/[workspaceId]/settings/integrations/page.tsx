import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { getApiKeys } from "@/lib/api-keys-actions";
import { ApiKeyManager } from "@/components/integrations/api-keys-manager";

interface PageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function IntegrationsPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId: slug } = await params;
    const workspaceResult = await getWorkspaceBySlug(slug);

    if (workspaceResult.error || !workspaceResult.data) {
        notFound();
    }

    const workspace = workspaceResult.data;
    
    // Fetch initial API keys
    const apiKeysResult = await getApiKeys(workspace.id);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integraciones y Desarrolladores</h1>
                <p className="text-muted-foreground">
                    Gestiona tus claves de API para conectar herramientas externas como WhatsApp, Shalom o tus propios desarrollos.
                </p>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border flex items-center justify-between max-w-2xl">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Workspace ID</span>
                        <code className="text-sm font-mono bg-background px-2 py-1 rounded border shadow-sm">{workspace.id}</code>
                    </div>
                </div>
            </div>

            <ApiKeyManager 
                workspaceId={workspace.id} 
                initialKeys={apiKeysResult.data || []} 
            />
        </div>
    );
}
