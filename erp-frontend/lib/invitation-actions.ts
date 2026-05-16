"use server";

// Invitaciones de workspaces - Integrado con backend NestJS

import { revalidatePath } from "next/cache";
import { 
    sendInvitation as sendInvitationBase,
    getPendingInvitations as getPendingInvitationsBase,
    getWorkspaceInvitations as getWorkspaceInvitationsBase,
    acceptInvitation as acceptInvitationBase,
    rejectInvitation as rejectInvitationBase,
    cancelInvitation as cancelInvitationBase
} from "./actions";
import type { WorkspaceInvitation, Result } from "@/types";

// Send invitation to a user by email
export async function sendInvitation(
    workspaceId: string,
    email: string,
    workspaceSlug?: string,
    role: string = "member"
): Promise<Result<WorkspaceInvitation>> {
    const result = await sendInvitationBase(workspaceId, email, workspaceSlug || "", role);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    if (workspaceSlug) {
        revalidatePath(`/workspaces/${workspaceSlug}/settings`);
    }
    return { success: true, data: result.data };
}

// Get pending invitations for the current user
export async function getPendingInvitations(): Promise<Result<WorkspaceInvitation[]>> {
    const result = await getPendingInvitationsBase();
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    return { success: true, data: result.data || [] };
}

// Accept an invitation
export async function acceptInvitation(invitationId: string): Promise<Result<void>> {
    const result = await acceptInvitationBase(invitationId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/workspaces");
    return { success: true, data: undefined };
}

// Reject an invitation
export async function rejectInvitation(invitationId: string): Promise<Result<void>> {
    const result = await rejectInvitationBase(invitationId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    revalidatePath("/workspaces");
    return { success: true, data: undefined };
}

// Get pending invitations for a workspace (sent by admins)
export async function getWorkspacePendingInvitations(workspaceId: string): Promise<Result<WorkspaceInvitation[]>> {
    const result = await getWorkspaceInvitationsBase(workspaceId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    return { success: true, data: result.data || [] };
}

// Cancel a sent invitation (for admins)
export async function cancelInvitation(invitationId: string, workspaceSlug?: string): Promise<Result<void>> {
    const result = await cancelInvitationBase(invitationId);
    
    if (!result.success) {
        return { success: false, error: result.error };
    }
    
    if (workspaceSlug) {
        revalidatePath(`/workspaces/${workspaceSlug}/settings`);
    }
    return { success: true, data: undefined };
}
