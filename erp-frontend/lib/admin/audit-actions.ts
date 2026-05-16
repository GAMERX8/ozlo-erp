"use server";

import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth-helpers";

export async function getAuditLogs(filters: {
    workspaceId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}) {
    try {
        const params = new URLSearchParams();
        
        if (filters.workspaceId) params.append("workspaceId", filters.workspaceId);
        if (filters.actorId) params.append("actorId", filters.actorId);
        if (filters.action) params.append("action", filters.action);
        if (filters.entityType) params.append("entityType", filters.entityType);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.limit) params.append("limit", filters.limit.toString());
        if (filters.offset) params.append("offset", filters.offset.toString());

        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("Error al obtener logs");
        }

        return await response.json();
    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        return { logs: [], total: 0, error: error.message };
    }
}

export async function getAuditActions() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/audit-actions`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error("Error al obtener acciones");
        }

        return await response.json();
    } catch (error: any) {
        console.error("Error fetching audit actions:", error);
        return { actions: [], error: error.message };
    }
}

export async function getWorkspaceActivity(workspaceId: string, limit?: number) {
    try {
        const params = limit ? `?limit=${limit}` : "";
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_URL}/admin/audit-logs/workspace/${workspaceId}${params}`,
            { headers, cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Error al obtener actividad del workspace");
        }

        return await response.json();
    } catch (error: any) {
        console.error("Error fetching workspace activity:", error);
        return { logs: [], error: error.message };
    }
}

export async function getUserActivity(userId: string, limit?: number) {
    try {
        const params = limit ? `?limit=${limit}` : "";
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${API_URL}/admin/audit-logs/user/${userId}${params}`,
            { headers, cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Error al obtener actividad del usuario");
        }

        return await response.json();
    } catch (error: any) {
        console.error("Error fetching user activity:", error);
        return { logs: [], error: error.message };
    }
}
