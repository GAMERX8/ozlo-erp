"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types/api";

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketType = 'question' | 'incident' | 'problem' | 'feature_request' | 'complaint';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  workspace_id: string;
  order_id?: string;
  client_id?: string;
  assigned_to?: string;
  assigned_to_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  created_by: string;
  created_by_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  tags?: string[];
  resolution_notes?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  content: string;
  is_internal: boolean;
  created_by: string;
  created_by_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  };
  created_at: string;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority: TicketPriority;
  type: TicketType;
  order_id?: string;
  client_id?: string;
  tags?: string[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  type?: TicketType;
  status?: TicketStatus;
  assigned_to?: string;
  tags?: string[];
  resolution_notes?: string;
}

export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  type?: TicketType | TicketType[];
  assigned_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TicketStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_today: number;
  avg_resolution_time?: string;
  by_priority: Record<TicketPriority, number>;
  by_type: Record<TicketType, number>;
}

// ==================== TICKET CRUD ====================

/**
 * Obtiene la lista de tickets de soporte
 */
export async function getSupportTickets(
  workspaceId: string,
  filters?: TicketFilters
): Promise<Result<{ data: SupportTicket[]; meta: { total: number; page: number; limit: number; totalPages: number } }>> {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams();
    params.append('workspaceId', workspaceId);
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }
    
    if (filters?.priority) {
      if (Array.isArray(filters.priority)) {
        filters.priority.forEach(p => params.append('priority', p));
      } else {
        params.append('priority', filters.priority);
      }
    }
    
    if (filters?.type) {
      if (Array.isArray(filters.type)) {
        filters.type.forEach(t => params.append('type', t));
      } else {
        params.append('type', filters.type);
      }
    }
    
    if (filters?.assigned_to) {
      params.append('assigned_to', filters.assigned_to);
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    if (filters?.page) {
      params.append('page', filters.page.toString());
    }
    
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    
    const response = await fetch(`${API_URL}/support-tickets?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener tickets" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error fetching tickets:", error);
    return { success: false, error: "Error al cargar los tickets" };
  }
}

/**
 * Obtiene un ticket por su ID
 */
export async function getSupportTicket(
  ticketId: string,
  workspaceId: string
): Promise<Result<SupportTicket>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/support-tickets/${ticketId}?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Ticket no encontrado" };
      }
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener ticket" };
    }

    const ticket = await response.json();
    return { success: true, data: ticket };
  } catch (error: any) {
    logger.error("Error fetching ticket:", error);
    return { success: false, error: "Error al cargar el ticket" };
  }
}

/**
 * Crea un nuevo ticket de soporte
 */
export async function createSupportTicket(
  workspaceId: string,
  data: CreateTicketData
): Promise<Result<SupportTicket>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/support-tickets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...data,
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear ticket" };
    }

    const ticket = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/support-tickets`);
    return { success: true, data: ticket };
  } catch (error: any) {
    logger.error("Error creating ticket:", error);
    return { success: false, error: "Error al crear el ticket" };
  }
}

/**
 * Actualiza un ticket existente
 */
export async function updateSupportTicket(
  ticketId: string,
  workspaceId: string,
  data: UpdateTicketData
): Promise<Result<SupportTicket>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/support-tickets/${ticketId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        ...data,
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar ticket" };
    }

    const ticket = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/support-tickets`);
    revalidatePath(`/workspaces/${workspaceId}/support-tickets/${ticketId}`);
    return { success: true, data: ticket };
  } catch (error: any) {
    logger.error("Error updating ticket:", error);
    return { success: false, error: "Error al actualizar el ticket" };
  }
}

/**
 * Elimina un ticket
 */
export async function deleteSupportTicket(
  ticketId: string,
  workspaceId: string
): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/support-tickets/${ticketId}?workspaceId=${workspaceId}`,
      { method: "DELETE", headers }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar ticket" };
    }

    revalidatePath(`/workspaces/${workspaceId}/support-tickets`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error deleting ticket:", error);
    return { success: false, error: "Error al eliminar el ticket" };
  }
}

// ==================== COMENTARIOS ====================

/**
 * Obtiene comentarios de un ticket
 */
export async function getTicketComments(
  ticketId: string,
  workspaceId: string
): Promise<Result<TicketComment[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/support-tickets/${ticketId}/comments?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener comentarios" };
    }

    const comments = await response.json();
    return { success: true, data: comments };
  } catch (error: any) {
    logger.error("Error fetching comments:", error);
    return { success: false, error: "Error al cargar los comentarios" };
  }
}

/**
 * Agrega un comentario a un ticket
 */
export async function addTicketComment(
  ticketId: string,
  workspaceId: string,
  content: string,
  isInternal: boolean = false
): Promise<Result<TicketComment>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/support-tickets/${ticketId}/comments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspace_id: workspaceId,
        content,
        is_internal: isInternal,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al agregar comentario" };
    }

    const comment = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/support-tickets/${ticketId}`);
    return { success: true, data: comment };
  } catch (error: any) {
    logger.error("Error adding comment:", error);
    return { success: false, error: "Error al agregar el comentario" };
  }
}

// ==================== ACCIONES ====================

/**
 * Asigna un ticket a un usuario
 */
export async function assignTicket(
  ticketId: string,
  workspaceId: string,
  userId: string
): Promise<Result<SupportTicket>> {
  return updateSupportTicket(ticketId, workspaceId, { assigned_to: userId });
}

/**
 * Resuelve un ticket
 */
export async function resolveTicket(
  ticketId: string,
  workspaceId: string,
  resolutionNotes: string
): Promise<Result<SupportTicket>> {
  return updateSupportTicket(ticketId, workspaceId, { 
    status: 'resolved',
    resolution_notes: resolutionNotes 
  });
}

/**
 * Cierra un ticket
 */
export async function closeTicket(
  ticketId: string,
  workspaceId: string
): Promise<Result<SupportTicket>> {
  return updateSupportTicket(ticketId, workspaceId, { status: 'closed' });
}

/**
 * Reabre un ticket
 */
export async function reopenTicket(
  ticketId: string,
  workspaceId: string
): Promise<Result<SupportTicket>> {
  return updateSupportTicket(ticketId, workspaceId, { status: 'open' });
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas de tickets
 */
export async function getTicketStats(
  workspaceId: string
): Promise<Result<TicketStats>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/support-tickets/stats?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching ticket stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}
