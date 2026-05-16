"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceBySlug, updateWorkspace, deleteWorkspace } from "@/lib/workspace-actions";
import type { Workspace, UpdateWorkspaceData, Result } from "@/types";

/**
 * Query key para workspace
 */
export const workspaceKeys = {
    all: ["workspaces"] as const,
    lists: () => [...workspaceKeys.all, "list"] as const,
    list: (filters: string) => [...workspaceKeys.lists(), { filters }] as const,
    details: () => [...workspaceKeys.all, "detail"] as const,
    detail: (slug: string) => [...workspaceKeys.details(), slug] as const,
};

/**
 * Hook para obtener un workspace por su slug
 */
export function useWorkspace(slug: string) {
    return useQuery({
        queryKey: workspaceKeys.detail(slug),
        queryFn: async () => {
            const result = await getWorkspaceBySlug(slug);
            if (result.error || !result.data) {
                throw new Error(result.error || "Workspace not found");
            }
            return result.data;
        },
        // No fetch si no hay slug
        enabled: !!slug,
    });
}

/**
 * Hook para actualizar un workspace
 */
export function useUpdateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            slug,
            data,
        }: {
            id: string;
            slug: string;
            data: UpdateWorkspaceData;
        }) => {
            const result = await updateWorkspace(id, data);
            if (result.error) {
                throw new Error(result.error);
            }
        },
        onSuccess: (data, variables) => {
            // Invalidar cache del workspace específico
            queryClient.invalidateQueries({
                queryKey: workspaceKeys.detail(variables.slug),
            });
            // También invalidar la lista de workspaces
            queryClient.invalidateQueries({
                queryKey: workspaceKeys.lists(),
            });
        },
    });
}

/**
 * Hook para eliminar un workspace
 */
export function useDeleteWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const result = await deleteWorkspace(id);
            if (result.error) {
                throw new Error(result.error);
            }
        },
        onSuccess: () => {
            // Invalidar toda la cache de workspaces
            queryClient.invalidateQueries({
                queryKey: workspaceKeys.all,
            });
        },
    });
}
