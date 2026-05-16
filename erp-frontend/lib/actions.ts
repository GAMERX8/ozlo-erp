"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { auth } from "@/auth";
import { logger } from "./logger";

// Tipos centralizados
import type {
    Result,
    User,
    UserProfile,
    Workspace,
    WorkspaceMember,
    WorkspaceInvitation,
    CreateWorkspaceData,
    UpdateWorkspaceData,
    UpdateProfileData,
    RegisterUserData,
} from "@/types";

// Validaciones con Zod
import {
    registerSchema,
    createWorkspaceSchema,
    updateWorkspaceSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "./validations";

// ==================== AUTH ====================

export async function checkUserStatus(email: string): Promise<Result<{ status: string }>> {
    try {
        return { success: true, data: { status: 'not_found' } };
    } catch (error: any) {
        logger.error("Error checking user status:", error);
        return { success: false, error: "Error al verificar estado del usuario" };
    }
}

export async function registerUser(data: RegisterUserData): Promise<Result<{ success: true }>> {
    try {
        // Validar con Zod
        const validated = registerSchema.parse(data);
        
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validated),
        });

        if (!response.ok) {
            const error = await response.json();
            
            if (response.status === 409) {
                return { success: false, error: "Este correo ya está registrado. Por favor inicia sesión." };
            }
            
            return { success: false, error: error.message || "Error al registrar usuario" };
        }

        return { success: true, data: { success: true } };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: error.errors[0]?.message || "Datos inválidos" };
        }
        logger.error("Error in registerUser action:", error);
        return { success: false, error: "Error de conexión con el servidor" };
    }
}

// ==================== EMAIL VERIFICATION ====================

export async function verifyEmail(token: string): Promise<Result<void>> {
    try {
        verifyEmailSchema.parse({ token });
        
        const response = await fetch(`${API_URL}/auth/verify-email?token=${token}`);

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al verificar email" };
        }

        return { success: true, data: undefined };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: "Token inválido" };
        }
        return { success: false, error: "Error al verificar email" };
    }
}

export async function resendVerificationEmail(email: string): Promise<Result<void>> {
    try {
        const response = await fetch(`${API_URL}/auth/resend-verification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al reenviar verificación" };
        }

        return { success: true, data: undefined };
    } catch (error: any) {
        return { success: false, error: "Error al reenviar verificación" };
    }
}

// ==================== PASSWORD RESET ====================

export async function requestPasswordReset(email: string): Promise<Result<void>> {
    try {
        forgotPasswordSchema.parse({ email });
        
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al solicitar reset" };
        }

        return { success: true, data: undefined };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: "Email inválido" };
        }
        return { success: false, error: "Error al solicitar reset de contraseña" };
    }
}

export async function resetPassword(token: string, newPassword: string): Promise<Result<void>> {
    try {
        resetPasswordSchema.parse({ token, password: newPassword, confirmPassword: newPassword });
        
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, newPassword }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al resetear contraseña" };
        }

        return { success: true, data: undefined };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: error.errors[0]?.message || "Datos inválidos" };
        }
        return { success: false, error: "Error al resetear contraseña" };
    }
}

// ==================== WORKSPACES ====================

export async function getUserWorkspaces(): Promise<Result<Workspace[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces`, { headers });

        if (!response.ok) {
            throw new Error("Error al obtener workspaces");
        }

        const workspaces = await response.json();
        return { success: true, data: workspaces };
    } catch (error: any) {
        logger.error("Error fetching workspaces:", error);
        return { success: false, error: "Error al cargar los workspaces" };
    }
}

export async function createUserWorkspace(data: CreateWorkspaceData): Promise<Result<Workspace>> {
    try {
        const validated = createWorkspaceSchema.parse(data);
        
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces`, {
            method: "POST",
            headers,
            body: JSON.stringify(validated),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al crear workspace" };
        }

        const workspace = await response.json();
        revalidatePath("/workspaces");
        return { success: true, data: workspace };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: error.errors[0]?.message || "Datos inválidos" };
        }
        logger.error("Error creating workspace:", error);
        return { success: false, error: "Error al crear workspace" };
    }
}

export async function updateWorkspace(id: string, data: UpdateWorkspaceData): Promise<Result<void>> {
    try {
        const validated = updateWorkspaceSchema.parse(data);
        
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify(validated),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al actualizar workspace" };
        }

        const workspace = await response.json();
        revalidatePath("/workspaces");
        return { success: true, data: workspace };
    } catch (error: any) {
        if (error.name === "ZodError") {
            return { success: false, error: error.errors[0]?.message || "Datos inválidos" };
        }
        logger.error("Error updating workspace:", error);
        return { success: false, error: "Error al actualizar workspace" };
    }
}

export async function deleteWorkspace(id: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al eliminar workspace" };
        }

        revalidatePath("/workspaces");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error deleting workspace:", error);
        return { success: false, error: "Error al eliminar workspace" };
    }
}

// ==================== WORKSPACE MEMBERS ====================

export async function getWorkspaceMembers(workspaceId: string): Promise<Result<WorkspaceMember[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
            headers,
        });

        if (!response.ok) {
            throw new Error("Error al obtener miembros");
        }

        const members = await response.json();
        return { success: true, data: members };
    } catch (error: any) {
        logger.error("Error fetching members:", error);
        return { success: false, error: "Error al cargar los miembros" };
    }
}

export async function addWorkspaceMember(workspaceId: string, userId: string): Promise<Result<WorkspaceMember>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, {
            method: "POST",
            headers,
            body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al agregar miembro" };
        }

        const member = await response.json();
        revalidatePath(`/workspaces/${workspaceId}/members`);
        return { success: true, data: member };
    } catch (error: any) {
        logger.error("Error adding member:", error);
        return { success: false, error: "Error al agregar miembro" };
    }
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}`, {
            method: "DELETE",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al eliminar miembro" };
        }

        revalidatePath(`/workspaces/${workspaceId}/members`);
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error removing member:", error);
        return { success: false, error: "Error al eliminar miembro" };
    }
}

export async function leaveWorkspace(workspaceId: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/workspaces/${workspaceId}/leave`, {
            method: "POST",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al salir del workspace" };
        }

        revalidatePath("/workspaces");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error leaving workspace:", error);
        return { success: false, error: "Error al salir del workspace" };
    }
}

// ==================== INVITATIONS ====================

export async function sendInvitation(
    workspaceId: string,
    email: string,
    workspaceSlug: string,
    role: string = "member"
): Promise<Result<WorkspaceInvitation>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations`, {
            method: "POST",
            headers,
            body: JSON.stringify({ workspace_id: workspaceId, email, role }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al enviar invitación" };
        }

        const invitation = await response.json();
        revalidatePath(`/workspaces/${workspaceSlug}/members`);
        return { success: true, data: invitation };
    } catch (error: any) {
        logger.error("Error sending invitation:", error);
        return { success: false, error: "Error al enviar invitación" };
    }
}

export async function getPendingInvitations(): Promise<Result<WorkspaceInvitation[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations/pending`, {
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Error al obtener invitaciones" }));
            return { success: false, error: errorData.message || "Error al obtener invitaciones" };
        }

        const invitations = await response.json();
        return { success: true, data: invitations };
    } catch (error: any) {
        logger.error("Error fetching invitations:", error);
        return { success: false, error: "Error al cargar las invitaciones" };
    }
}

export async function getWorkspaceInvitations(workspaceId: string): Promise<Result<WorkspaceInvitation[]>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations/workspace/${workspaceId}`, {
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Error al obtener invitaciones" }));
            return { success: false, error: errorData.message || "Error al obtener invitaciones" };
        }

        const invitations = await response.json();
        return { success: true, data: invitations };
    } catch (error: any) {
        logger.error("Error fetching workspace invitations:", error);
        return { success: false, error: "Error al cargar las invitaciones" };
    }
}

export async function acceptInvitation(invitationId: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations/${invitationId}/accept`, {
            method: "POST",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al aceptar invitación" };
        }

        revalidatePath("/workspaces");
        revalidatePath("/workspaces", "layout");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error accepting invitation:", error);
        return { success: false, error: "Error al aceptar invitación" };
    }
}

export async function rejectInvitation(invitationId: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations/${invitationId}/reject`, {
            method: "POST",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al rechazar invitación" };
        }

        revalidatePath("/workspaces", "layout");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error rejecting invitation:", error);
        return { success: false, error: "Error al rechazar invitación" };
    }
}

export async function cancelInvitation(invitationId: string): Promise<Result<void>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/invitations/${invitationId}`, {
            method: "DELETE",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message || "Error al cancelar invitación" };
        }

        revalidatePath("/workspaces");
        return { success: true, data: undefined };
    } catch (error: any) {
        logger.error("Error canceling invitation:", error);
        return { success: false, error: "Error al cancelar invitación" };
    }
}

// ==================== USER SEARCH ====================

export async function findUserByEmail(email: string): Promise<Result<{ id: string; email: string; first_name: string | null; last_name: string | null } | null>> {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/users/search?email=${encodeURIComponent(email)}`, {
            headers,
        });

        if (response.status === 404) {
            return { success: true, data: null };
        }

        if (!response.ok) {
            throw new Error("Error al buscar usuario");
        }

        const user = await response.json();
        return { success: true, data: user };
    } catch (error: any) {
        logger.error("Error finding user:", error);
        return { success: false, error: "Error al buscar usuario" };
    }
}


