"use server";

import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { logger } from "./logger";
import { 
    deleteWorkspace as deleteWorkspaceBase
} from "./actions";

// ==================== DASHBOARD ====================

export interface DashboardStats {
    overview: {
        totalUsers: number;
        totalWorkspaces: number;
        activeWorkspaces: number;
        conversionRate: string;
    };
    recentUsers: Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        date_created: string;
    }>;
    recentWorkspaces: Array<{
        id: string;
        name: string;
        slug: string;
        owner: {
            email: string;
            first_name: string | null;
            last_name: string | null;
        };
        _count?: {
            members: number;
        };
        date_created: string;
    }>;
    revenue: Array<{
        month: string;
        count: number;
    }>;
}

export async function getAdminDashboardStats(): Promise<Result<DashboardStats>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/dashboard`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener estadísticas del dashboard" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching dashboard stats:", error);
        return { success: false, error: "Error al obtener estadísticas" };
    }
}

// ==================== USERS ====================

export interface AdminUser {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    email_verified?: boolean;
    date_created: string;
    _count?: {
        workspaces: number;
        workspaceMembers: number;
    };
}

export interface AdminUsersResponse {
    data: AdminUser[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export async function getAdminUsers(params?: { page?: number; limit?: number; search?: string }): Promise<Result<AdminUsersResponse>> {
    try {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);

        const response = await fetch(`${API_URL}/admin/users?${queryParams}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener usuarios" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching users:", error);
        return { success: false, error: "Error al obtener usuarios" };
    }
}

export async function getAdminUserById(id: string): Promise<Result<AdminUser>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener usuario" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching user:", error);
        return { success: false, error: "Error al obtener usuario" };
    }
}

export async function updateUserRole(id: string, role: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/users/${id}/role`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ role }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al actualizar rol" };
        }

        revalidatePath("/admin/users");
        return { success: true, data: undefined };
    } catch (error) {
        logger.error("Error updating user role:", error);
        return { success: false, error: "Error al actualizar rol" };
    }
}

export async function deleteUser(id: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/users/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al eliminar usuario" };
        }

        revalidatePath("/admin/users");
        return { success: true, data: undefined };
    } catch (error) {
        logger.error("Error deleting user:", error);
        return { success: false, error: "Error al eliminar usuario" };
    }
}

// ==================== WORKSPACES ====================

export interface AdminWorkspace {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
    owner?: {
        email: string;
        first_name: string | null;
        last_name: string | null;
    };
    plan: string;
    date_created: string;
    _count?: {
        members: number;
    };
}

export interface AdminWorkspacesResponse {
    data: AdminWorkspace[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export async function getAdminWorkspaces(params?: { page?: number; limit?: number; search?: string }): Promise<Result<AdminWorkspacesResponse>> {
    try {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.search) queryParams.set("search", params.search);

        const response = await fetch(`${API_URL}/admin/workspaces?${queryParams}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener workspaces" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching workspaces:", error);
        return { success: false, error: "Error al obtener workspaces" };
    }
}

export async function getAdminWorkspaceById(id: string): Promise<Result<AdminWorkspace>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/workspaces/${id}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener workspace" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching workspace:", error);
        return { success: false, error: "Error al obtener workspace" };
    }
}

// Usa el endpoint de actions.ts para mantener consistencia
export async function deleteWorkspace(id: string): Promise<Result<void>> {
    const result = await deleteWorkspaceBase(id);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/admin/workspaces");
    return { success: true, data: undefined };
}

// ==================== PLANS ====================

export interface AdminPlanConfig {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    is_active: boolean;
    features: string[];
    created_at: string;
    updated_at: string;
}

export async function getAdminPlans(): Promise<Result<AdminPlanConfig[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener planes" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching plans:", error);
        return { success: false, error: "Error al obtener planes" };
    }
}

export async function createAdminPlan(data: Partial<AdminPlanConfig>): Promise<Result<AdminPlanConfig>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans`, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al crear plan" };
        }

        revalidatePath("/admin/plan-configs");
        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        logger.error("Error creating plan:", error);
        return { success: false, error: "Error al crear plan" };
    }
}

export async function updateAdminPlan(id: string, data: Partial<AdminPlanConfig>): Promise<Result<AdminPlanConfig>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans/config/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al actualizar plan" };
        }

        revalidatePath("/admin/plan-configs");
        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        logger.error("Error updating plan:", error);
        return { success: false, error: "Error al actualizar plan" };
    }
}

export async function deleteAdminPlan(id: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans/config/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al eliminar plan" };
        }

        revalidatePath("/admin/plan-configs");
        return { success: true, data: undefined };
    } catch (error) {
        logger.error("Error deleting plan:", error);
        return { success: false, error: "Error al eliminar plan" };
    }
}

export interface AdminPlan {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
    current_subscription?: {
        stripe_subscription_id?: string;
        current_period_start?: string;
        current_period_end?: string;
        cancel_at_period_end?: boolean;
    };
    owner?: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
    };
    _count?: {
        instances: number;
    };
}

export interface AdminActivePlansResponse {
    plans: AdminPlan[];
    total: number;
    page: number;
    limit: number;
}

export async function getAdminActivePlans(params?: { page?: number; limit?: number; status?: string }): Promise<Result<AdminActivePlansResponse>> {
    try {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        
        if (params?.page) queryParams.set("page", params.page.toString());
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.status) queryParams.set("status", params.status);

        const response = await fetch(`${API_URL}/admin/plans/active?${queryParams}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener planes activos" };
        }

        const json = await response.json();
        const formattedData: AdminActivePlansResponse = {
            plans: json.data || [],
            total: json.meta?.total || 0,
            page: json.meta?.page || 1,
            limit: json.meta?.limit || 20
        };
        return { success: true, data: formattedData };
    } catch (error) {
        logger.error("Error fetching active plans:", error);
        return { success: false, error: "Error al obtener planes activos" };
    }
}

export async function getAdminPlanById(id: string): Promise<Result<AdminPlan>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans/${id}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener plan" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching plan:", error);
        return { success: false, error: "Error al obtener plan" };
    }
}

export async function updatePlanStatus(id: string, status: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/plans/${id}/status`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al actualizar estado del plan" };
        }

        revalidatePath("/admin/plans");
        return { success: true, data: undefined };
    } catch (error) {
        logger.error("Error updating plan status:", error);
        return { success: false, error: "Error al actualizar estado del plan" };
    }
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_id: string | null;
    actor_type?: string;
    workspace_id: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
    metadata?: any;
    before_state?: any;
    after_state?: any;
    success?: boolean;
    error_message?: string | null;
    created_at?: string;
    date_created?: string;
    actor?: {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
    } | null;
    workspace?: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export interface AuditLogsResponse {
    logs: AuditLog[];
    total: number;
    limit: number;
    offset: number;
}

export async function getAuditLogs(params?: {
    workspaceId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}): Promise<Result<AuditLogsResponse>> {
    try {
        const headers = await getAuthHeaders();
        const queryParams = new URLSearchParams();
        
        if (params?.workspaceId) queryParams.set("workspaceId", params.workspaceId);
        if (params?.actorId) queryParams.set("actorId", params.actorId);
        if (params?.action) queryParams.set("action", params.action);
        if (params?.entityType) queryParams.set("entityType", params.entityType);
        if (params?.startDate) queryParams.set("startDate", params.startDate);
        if (params?.endDate) queryParams.set("endDate", params.endDate);
        if (params?.limit) queryParams.set("limit", params.limit.toString());
        if (params?.offset) queryParams.set("offset", params.offset.toString());

        const response = await fetch(`${API_URL}/admin/audit-logs?${queryParams}`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener logs de auditoría" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logger.error("Error fetching audit logs:", error);
        return { success: false, error: "Error al obtener logs de auditoría" };
    }
}

export async function getAuditActions(): Promise<Result<string[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/admin/audit-logs/actions`, {
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            return { success: false, error: "Error al obtener acciones de auditoría" };
        }

        const data = await response.json();
        return { success: true, data: data.actions || [] };
    } catch (error) {
        logger.error("Error fetching audit actions:", error);
        return { success: false, error: "Error al obtener acciones de auditoría" };
    }
}
