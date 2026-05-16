"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkspaceBillingStatus } from "@/components/billing/workspace-billing-status";
import { Workspace } from "@/lib/workspace-actions";
import { usePermissions } from "@/hooks/use-permissions";

interface WorkspaceBillingProps {
    workspace: Workspace;
    currentUserId: string;
    searchParams: { success?: string; canceled?: string };
}

export function WorkspaceBilling({
    workspace,
    searchParams,
}: WorkspaceBillingProps) {
    const { canManageBilling } = usePermissions(workspace);
    
    const success = searchParams.success === 'true';
    const canceled = searchParams.canceled === 'true';

    return (
        <div className="flex flex-col animate-in fade-in duration-500 pb-12 gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Gestiona tu suscripción y pagos de <span className="font-medium">{workspace.name}</span>
                </p>
            </div>

            {/* Stripe Messages */}
            {success && (
                <Alert>
                    <CheckCircle2 className="size-4" />
                    <AlertDescription>
                        ¡Pago completado exitosamente! Tu suscripción está activa.
                    </AlertDescription>
                </Alert>
            )}
            {canceled && (
                <Alert>
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                        El proceso de pago fue cancelado.
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-6">
                {canManageBilling ? (
                    <WorkspaceBillingStatus
                        workspaceId={workspace.id}
                        workspaceSlug={workspace.slug}
                    />
                ) : (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <AlertCircle className="size-10 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-muted-foreground font-medium">Solo administradores pueden gestionar la facturación.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
