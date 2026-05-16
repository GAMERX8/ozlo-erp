"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import type { Result, Workspace, WorkspaceMember } from "@/types";
import { 
    getUserWorkspaces as getUserWorkspacesNestJS,
    createUserWorkspace as createUserWorkspaceNestJS,
    updateWorkspace as updateWorkspaceNestJS,
    deleteWorkspace as deleteWorkspaceBase,
    getWorkspaceMembers as getWorkspaceMembersNestJS,
    addWorkspaceMember as addWorkspaceMemberNestJS,
    removeWorkspaceMember as removeWorkspaceMemberNestJS,
    leaveWorkspace as leaveWorkspaceNestJS
} from "./actions";

export type { Workspace, WorkspaceMember } from "@/types";

export interface CreateWorkspaceData {
    name: string;
    slug?: string;
    phone?: string;
    website?: string;
}

export interface UpdateWorkspaceData {
    name?: string;
    slug?: string;
    status?: string;
    phone?: string;
    website?: string;
}

// Check if user is workspace owner
export async function isWorkspaceOwner(workspaceId: string, userId: string): Promise<boolean> {
    const result = await getUserWorkspacesNestJS();
    
    if (!result.success || !result.data) return false;
    
    const workspace = result.data.find(w => w.id === workspaceId);
    if (!workspace) return false;
    
    return workspace.owner_id === userId;
}

// Get all workspaces - DELEGATED TO NESTJS
export async function getWorkspaces(): Promise<Result<Workspace[]>> {
    const result = await getUserWorkspacesNestJS();
    if (!result.success) {
        return { success: false, error: result.error };
    }
    return { success: true, data: (result.data || []) as Workspace[] };
}

// Get a single workspace by ID - DELEGATED TO NESTJS
export async function getWorkspace(id: string): Promise<Result<Workspace>> {
    const result = await getUserWorkspacesNestJS();
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    const workspace = result.data?.find(w => w.id === id);
    if (!workspace) {
        return { success: false, error: "Workspace no encontrado" };
    }
    
    return { success: true, data: workspace as Workspace };
}

// Get a single workspace by slug - uses dedicated endpoint
export async function getWorkspaceBySlug(slug: string): Promise<Result<Workspace>> {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/workspaces/by-slug/${slug}`, {
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: "Workspace no encontrado" };
            }
            const error = await response.json();
            return { success: false, error: error.message || "Error al obtener workspace" };
        }

        const workspace = await response.json();
        return { success: true, data: workspace as Workspace };
    } catch (error: any) {
        console.error("Error fetching workspace by slug:", error);
        return { success: false, error: "Error al cargar el workspace" };
    }
}

// Create a new workspace - DELEGATED TO NESTJS
export async function createWorkspace(data: CreateWorkspaceData): Promise<Result<Workspace>> {
    const result = await createUserWorkspaceNestJS({
        name: data.name,
        slug: data.slug,
    });
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/workspaces");
    return { success: true, data: result.data as Workspace };
}

// Update a workspace - DELEGATED TO NESTJS
export async function updateWorkspace(id: string, data: UpdateWorkspaceData): Promise<Result<void>> {
    const result = await updateWorkspaceNestJS(id, data);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/workspaces");
    revalidatePath(`/workspaces/${id}`);
    return { success: true, data: undefined };
}

// Delete a workspace - DELEGATED TO NESTJS
export async function deleteWorkspace(id: string): Promise<Result<void>> {
    const result = await deleteWorkspaceBase(id);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/workspaces");
    return { success: true, data: undefined };
}

// ==================== MEMBERS ====================

// Get workspace members - DELEGATED TO NESTJS
export async function getWorkspaceMembers(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    const result = await getWorkspaceMembersNestJS(workspaceId);
    if (!result.success) {
        return { success: false, error: result.error };
    }
    return { success: true, data: (result.data || []) as WorkspaceMember[] };
}

// Add workspace member - DELEGATED TO NESTJS
export async function addWorkspaceMember(workspaceId: string, userId: string): Promise<Result<WorkspaceMember>> {
    const result = await addWorkspaceMemberNestJS(workspaceId, userId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath(`/workspaces/${workspaceId}/settings`);
    return { success: true, data: result.data as WorkspaceMember };
}

// Remove workspace member - DELEGATED TO NESTJS
export async function removeWorkspaceMember(memberId: string) {
    // Necesitamos el workspaceId para el endpoint, lo obtendremos del contexto
    // Por ahora, esta función requiere workspaceId
    return { error: "Se requiere workspaceId. Usa removeWorkspaceMemberWithSlug." };
}

// Remove workspace member with slug - DELEGATED TO NESTJS
export async function removeWorkspaceMemberWithSlug(memberId: string, workspaceSlug: string): Promise<Result<void>> {
    // Primero obtenemos el workspace para tener el ID
    const workspaceResult = await getWorkspaceBySlug(workspaceSlug);
    if (!workspaceResult.success || !workspaceResult.data) {
        return { success: false, error: "Workspace no encontrado" };
    }
    
    const result = await removeWorkspaceMemberNestJS(workspaceResult.data.id, memberId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath(`/workspaces/${workspaceSlug}/settings`);
    return { success: true, data: undefined };
}

// Leave workspace - DELEGATED TO NESTJS
export async function leaveWorkspace(workspaceId: string) {
    const result = await leaveWorkspaceNestJS(workspaceId);
    
    if (!result.success) {
        return { error: result.error };
    }
    
    revalidatePath("/workspaces");
    return { success: true };
}
