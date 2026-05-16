"use client";

import { useEffect, useState } from "react";
import { PlanSelector } from "@/components/subscription/plan-selector";
import { getWorkspaceBillingStatus } from "@/lib/stripe-actions";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

interface PlanSelectorWrapperProps {
    workspaceId: string;
    workspaceSlug: string;
    promoCode?: string | null;
}

export function PlanSelectorWrapper({ workspaceId, workspaceSlug, promoCode }: PlanSelectorWrapperProps) {
    const [billingStatus, setBillingStatus] = useState<{
        plan: string;
        planStatus: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadBillingStatus() {
            try {
                const result = await getWorkspaceBillingStatus(workspaceId);
                if (result.success && result.data) {
                    setBillingStatus({
                        plan: result.data.plan,
                        planStatus: result.data.planStatus,
                    });
                }
            } catch (error) {
                toast.error("Error al cargar el estado de facturación");
            } finally {
                setIsLoading(false);
            }
        }
        loadBillingStatus();
    }, [workspaceId]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!billingStatus) {
        return (
            <div className="text-center py-12">
                <CreditCard className="mx-auto size-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">Error al cargar planes</h3>
                <p className="text-sm text-muted-foreground mt-1">Por favor, intenta de nuevo.</p>
            </div>
        );
    }

    return (
        <PlanSelector
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            currentPlan={billingStatus.plan}
            planStatus={billingStatus.planStatus}
            promoCode={promoCode}
            onSuccess={() => {
                // Redirigir al workspace después de seleccionar plan
                window.location.href = `/workspaces/${workspaceSlug}`;
            }}
        />
    );
}
