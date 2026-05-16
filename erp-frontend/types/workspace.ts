/**
 * Tipos relacionados con workspaces
 */

import type { User, UserRole } from "./user";

/**
 * Plan de workspace - string flexible para soportar planes dinámicos de la DB
 * El plan 'free' es un concepto fijo en el sistema
 */
export type WorkspacePlan = string;

/**
 * Estado del workspace
 */
export type WorkspaceStatus = "active" | "past_due" | "suspended";

/**
 * Miembro de un workspace
 */
export interface WorkspaceMember {
    id: string;
    user_id: string | { id: string; first_name: string; last_name: string; email: string };
    workspace_id?: string;
    role: UserRole | string;
    isOwner?: boolean;
    date_created?: string;
    user?: User;
}

/**
 * Invitación a workspace
 */
export interface WorkspaceInvitation {
    id: string;
    workspace_id: string | {
        id: string;
        name: string;
        slug: string;
    };
    email: string;
    role: UserRole;
    invited_by: string | {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    invited_by_user?: User;
    invited_user_id?: string | {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    status: "pending" | "accepted" | "rejected" | "expired";
    date_created: string;
    expires_at?: string;
    workspace?: {
        id: string;
        name: string;
        slug: string;
    };
}

/**
 * Workspace completo
 */
export interface Workspace {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
    owner?: User | string | { id: string; first_name: string; last_name: string; email: string };
    plan: WorkspacePlan;
    status?: string;
    phone?: string | null;
    website?: string | null;
    date_created?: string;
    date_updated?: string | null;
    members?: WorkspaceMember[];
    stripe_subscription_id?: string | null;
    stripe_price_id?: string | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
    // Campos opcionales que vienen en respuestas anidadas
    instances?: {
        id: string;
        name: string;
        status: string;
        ai_model?: string | null;
        integration_channel?: string | null;
        subscription?: {
            status: string;
            current_period_end?: string | null;
            cancel_at_period_end?: boolean;
        }[];
    }[];
}

/**
 * Workspace simplificado (para listas)
 */
export interface WorkspaceSummary {
    id: string;
    name: string;
    slug: string;
    role: UserRole;
    plan: WorkspacePlan;
}

/**
 * Datos para crear workspace
 */
export interface CreateWorkspaceData {
    name: string;
    slug?: string;
    phone?: string;
    website?: string;
}

/**
 * Datos para actualizar workspace
 */
export interface UpdateWorkspaceData {
    name?: string;
    slug?: string;
    status?: string;
    phone?: string;
    website?: string;
}
