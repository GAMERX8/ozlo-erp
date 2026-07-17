import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { getApiKeys } from "@/lib/api-keys-actions";
import { ApiKeyManager } from "@/components/integrations/api-keys-manager";
import { WppManager } from "@/components/integrations/wpp-manager";
import { getWppIntegration } from "@/lib/integrations-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, MessageSquare } from "lucide-react";

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
    
    // Fetch initial API keys and WhatsApp config
    const [apiKeysResult, wppResult] = await Promise.all([
        getApiKeys(workspace.id),
        getWppIntegration(workspace.id)
    ]);

    const wppConfig = wppResult.data || { 
        instanceName: "", 
        apiKey: "", 
        instanceUrl: "", 
        adminPhone: "", 
        clientNotificationsEnabled: false, 
        templates: {},
        is_active: false 
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integraciones y Desarrolladores</h1>
                <p className="text-muted-foreground">
                    Gestiona tus claves de API para conectar herramientas externas o configura webhooks para notificaciones en tiempo real.
                </p>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border flex items-center justify-between max-w-2xl text-xs sm:text-sm">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Workspace ID</span>
                        <code className="text-sm font-mono bg-background px-2 py-1 rounded border shadow-sm select-all">{workspace.id}</code>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="api-keys" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                    <TabsTrigger value="api-keys" className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        <span>Claves API</span>
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                        <span>WhatsApp (Wpp)</span>
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="api-keys" className="space-y-4">
                    <ApiKeyManager 
                        workspaceId={workspace.id} 
                        initialKeys={apiKeysResult.data || []} 
                    />
                </TabsContent>
                
                <TabsContent value="whatsapp" className="space-y-4 animate-in fade-in duration-300">
                    <WppManager
                        workspaceId={workspace.id}
                        initialInstanceName={wppConfig.instanceName}
                        initialApiKey={wppConfig.apiKey}
                        initialInstanceUrl={wppConfig.instanceUrl}
                        initialAdminPhone={wppConfig.adminPhone}
                        initialClientNotificationsEnabled={wppConfig.clientNotificationsEnabled}
                        initialTemplates={wppConfig.templates || {}}
                        initialIsActive={wppConfig.is_active}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
