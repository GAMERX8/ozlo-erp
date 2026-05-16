"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { API_URL } from "./config";
import { logger } from "./logger";
import type { Result, ApiKey } from "@/types";

export async function getApiKeys(workspaceId: string): Promise<Result<ApiKey[]>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/api-keys?workspaceId=${workspaceId}`, {
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener las API Keys" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error fetching API keys:", error);
        return { success: false, error: "Error al obtener las API Keys" };
    }
}

export async function createApiKey(workspaceId: string, name: string, expiresAt?: string): Promise<Result<ApiKey>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/api-keys?workspaceId=${workspaceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ name, expiresAt }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al crear la API Key" };
        }

        const data = await response.json();
        revalidatePath("/(dashboard)/[workspaceId]/settings/integrations", "page");
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error creating API key:", error);
        return { success: false, error: "Error al crear la API Key" };
    }
}

export async function revokeApiKey(workspaceId: string, id: string): Promise<Result<void>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/api-keys/${id}?workspaceId=${workspaceId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al revocar la API Key" };
        }

        revalidatePath("/(dashboard)/[workspaceId]/settings/integrations", "page");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error revoking API key:", error);
        return { success: false, error: "Error al revocar la API Key" };
    }
}

export async function regenerateApiKey(workspaceId: string, id: string): Promise<Result<ApiKey>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/api-keys/${id}/regenerate?workspaceId=${workspaceId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al regenerar la API Key" };
        }

        const data = await response.json();
        revalidatePath("/(dashboard)/[workspaceId]/settings/integrations", "page");
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error regenerating API key:", error);
        return { success: false, error: "Error al regenerar la API Key" };
    }
}
