"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { API_URL } from "./config";
import { logger } from "./logger";
import type { Result } from "@/types";

export interface WppIntegrationConfig {
    instanceName: string;
    apiKey: string;
    instanceUrl: string;
    adminPhone: string;
    clientNotificationsEnabled: boolean;
    templates: Record<string, string>;
    is_active: boolean;
}

export async function getWppIntegration(workspaceId: string): Promise<Result<WppIntegrationConfig>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/integrations/wpp?workspaceId=${workspaceId}`, {
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener la configuración de WhatsApp" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error fetching Wpp integration:", error);
        return { success: false, error: "Error al obtener la configuración de WhatsApp" };
    }
}

export async function saveWppIntegration(
    workspaceId: string, 
    config: WppIntegrationConfig
): Promise<Result<WppIntegrationConfig>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/integrations/wpp?workspaceId=${workspaceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                instanceName: config.instanceName,
                apiKey: config.apiKey,
                instanceUrl: config.instanceUrl,
                adminPhone: config.adminPhone,
                clientNotificationsEnabled: config.clientNotificationsEnabled,
                templates: config.templates,
                is_active: config.is_active
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al guardar la configuración" };
        }

        const data = await response.json();
        revalidatePath("/(dashboard)/[workspaceId]/settings/integrations", "page");
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error saving Wpp integration:", error);
        return { success: false, error: "Error al guardar la configuración" };
    }
}

export async function testWppIntegration(workspaceId: string): Promise<Result<{ success: boolean }>> {
    try {
        const session = await auth();
        if (!session?.access_token) {
            return { success: false, error: "No estás autenticado" };
        }

        const response = await fetch(`${API_URL}/integrations/wpp/test?workspaceId=${workspaceId}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${session.access_token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al enviar la prueba" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        logger.error("Error testing Wpp integration:", error);
        return { success: false, error: "Error al enviar la prueba" };
    }
}
