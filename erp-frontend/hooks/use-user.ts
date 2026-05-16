"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, updateProfile } from "@/lib/profile-actions";
import type { UserProfile, UpdateProfileData } from "@/types";

/**
 * Query keys para usuario
 */
export const userKeys = {
    all: ["user"] as const,
    profile: () => [...userKeys.all, "profile"] as const,
};

/**
 * Hook para obtener el perfil del usuario actual
 */
export function useUserProfile() {
    return useQuery({
        queryKey: userKeys.profile(),
        queryFn: async () => {
            const result = await getCurrentUser();
            if (result.error || !result.data) {
                throw new Error(result.error || "Failed to load profile");
            }
            return result.data;
        },
        // Revalidar cada 5 minutos
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para actualizar el perfil
 */
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateProfileData) => {
            const result = await updateProfile(data);
            if (result.error) {
                throw new Error(result.error);
            }
            return result.success;
        },
        onSuccess: () => {
            // Invalidar el perfil para que se recargue
            queryClient.invalidateQueries({
                queryKey: userKeys.profile(),
            });
        },
    });
}
