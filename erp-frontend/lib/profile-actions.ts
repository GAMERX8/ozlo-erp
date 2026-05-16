"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { API_URL } from "./config";
import { getAccessToken } from "./auth-helpers";
import { logger } from "./logger";
import type { Result, UserProfile, ChangePasswordData } from "@/types";

export type { UserProfile, ChangePasswordData } from "@/types";

export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
}

// Get current user profile - FETCH FROM BACKEND
export async function getCurrentUser(): Promise<Result<UserProfile>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            // Fallback to session data if API fails
            return {
                success: true,
                data: {
                    id: session.user.id,
                    email: session.user.email || "",
                    first_name: session.user.first_name || null,
                    last_name: session.user.last_name || null,
                }
            };
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : {};  // Handle empty response
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error fetching user profile:", error);
        return { success: false, error: "Error al obtener el perfil" };
    }
}


// Update user profile - DELEGATED TO NESTJS BACKEND
export async function updateProfile(data: UpdateProfileData): Promise<Result<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/auth/profile`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al actualizar el perfil" };
        }

        revalidatePath("/workspaces", "layout");
        revalidatePath("/workspaces");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error updating profile:", error);
        return { success: false, error: "Error al actualizar el perfil" };
    }
}

// Change user password - DELEGATED TO NESTJS BACKEND
export async function changePassword(data: ChangePasswordData): Promise<Result<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al cambiar la contraseña" };
        }

        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error changing password:", error);
        return { success: false, error: "Error al cambiar la contraseña" };
    }
}

export interface MfaSetupData {
    secret: string;
    qrCode: string;
}

// Setup MFA - DELEGATED TO NESTJS BACKEND
export async function setupMfa(): Promise<Result<MfaSetupData>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/mfa/setup`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al configurar MFA" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error setting up MFA:", error);
        return { success: false, error: "Error al configurar MFA" };
    }
}

// Verify MFA - DELEGATED TO NESTJS BACKEND
export async function verifyMfa(code: string): Promise<Result<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/mfa/verify`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Código inválido" };
        }

        revalidatePath("/workspaces", "layout");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error verifying MFA:", error);
        return { success: false, error: "Error al verificar MFA" };
    }
}

// Disable MFA - DELEGATED TO NESTJS BACKEND
export async function disableMfa(code: string): Promise<Result<void>> {
    try {
        const session = await auth();
        if (!session?.user?.id || !session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/mfa/disable`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al desactivar MFA" };
        }

        revalidatePath("/workspaces", "layout");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error disabling MFA:", error);
        return { success: false, error: "Error al desactivar MFA" };
    }
}
