"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getWorkspaceBillingStatus,
    createCheckoutSession,
    createBillingPortalSession,
    upgradePlan,
    cancelWorkspaceSubscription,
    reactivateWorkspaceSubscription,
} from "@/lib/stripe-actions";
import type { BillingStatus, CreateCheckoutData, WorkspacePlan } from "@/types";

/**
 * Query keys para billing
 */
export const billingKeys = {
    all: ["billing"] as const,
    status: (workspaceId: string) => [...billingKeys.all, "status", workspaceId] as const,
};

/**
 * Hook para obtener el estado de facturación de un workspace
 */
export function useBillingStatus(workspaceId: string) {
    return useQuery({
        queryKey: billingKeys.status(workspaceId),
        queryFn: async () => {
            const result = await getWorkspaceBillingStatus(workspaceId);
            if (!result.success || !result.data) {
                throw new Error(result.error || "Failed to load billing status");
            }
            return result.data;
        },
        enabled: !!workspaceId,
        // Refrescar cada 10 segundos para detectar cambios rápidamente (cancelación, etc.)
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
        staleTime: 5000,
    });
}

/**
 * Hook para crear una sesión de checkout
 */
export function useCreateCheckout() {
    return useMutation({
        mutationFn: async (data: CreateCheckoutData) => {
            const result = await createCheckoutSession(data);
            if (result.error) {
                throw new Error(result.error);
            }
            if (!result.checkoutUrl) {
                throw new Error("No checkout URL received");
            }
            return result.checkoutUrl;
        },
    });
}

/**
 * Hook para crear una sesión del portal de facturación
 */
export function useCreatePortalSession() {
    return useMutation({
        mutationFn: async ({
            workspaceId,
            returnUrl,
        }: {
            workspaceId: string;
            returnUrl: string;
        }) => {
            const result = await createBillingPortalSession({ workspaceId, returnUrl });
            if (result.error) {
                throw new Error(result.error);
            }
            if (!result.portalUrl) {
                throw new Error("No portal URL received");
            }
            return result.portalUrl;
        },
    });
}

/**
 * Hook para hacer upgrade/downgrade de plan
 */
export function useUpgradePlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            workspaceId,
            plan,
        }: {
            workspaceId: string;
            plan: WorkspacePlan;
        }) => {
            const result = await upgradePlan(workspaceId, plan);
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: (data, variables) => {
            // Invalidar el estado de facturación
            queryClient.invalidateQueries({
                queryKey: billingKeys.status(variables.workspaceId),
            });
        },
    });
}

/**
 * Hook para cancelar suscripción
 */
export function useCancelSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (workspaceId: string) => {
            const result = await cancelWorkspaceSubscription(workspaceId);
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: (data, workspaceId) => {
            queryClient.invalidateQueries({
                queryKey: billingKeys.status(workspaceId),
            });
        },
    });
}

/**
 * Hook para reactivar suscripción
 */
export function useReactivateSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (workspaceId: string) => {
            const result = await reactivateWorkspaceSubscription(workspaceId);
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        },
        onSuccess: (data, workspaceId) => {
            queryClient.invalidateQueries({
                queryKey: billingKeys.status(workspaceId),
            });
        },
    });
}
