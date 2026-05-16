"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type {
  OrderStatus,
  Order
} from "@/types/order";
import type { Result } from "@/types/api";

export interface OperationsStats {
  total_orders: number;
  by_status: Record<OrderStatus, number>;
  pending_confirmation: number;
  pending_preparation: number;
  in_transit: number;
  delivered_today: number;
  delayed_orders: number;
}

export interface KanbanColumn {
  status: OrderStatus;
  title: string;
  orders: Order[];
}

// ==================== KANBAN / PIPELINE ====================

/**
 * Obtiene órdenes agrupadas por estado para el kanban de operaciones
 */
export async function getOrdersByStatus(
  workspaceId: string
): Promise<Result<KanbanColumn[]>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/operations/kanban?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener kanban" };
    }

    const columns = await response.json();
    return { success: true, data: columns };
  } catch (error: any) {
    logger.error("Error fetching kanban data:", error);
    return { success: false, error: "Error al cargar el pipeline" };
  }
}

/**
 * Obtiene estadísticas de operaciones
 */
export async function getOperationsStats(
  workspaceId: string
): Promise<Result<OperationsStats>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/operations/stats?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching operations stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}

/**
 * Mueve una orden a otro estado (drag & drop)
 */
export async function moveOrderStatus(
  workspaceId: string,
  orderId: string,
  newStatus: OrderStatus,
  notes?: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/move?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        status: newStatus,
        notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al mover orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error moving order:", error);
    return { success: false, error: "Error al mover la orden" };
  }
}

/**
 * Acción rápida: Confirmar orden
 */
export async function quickConfirmOrder(
  workspaceId: string,
  orderId: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/quick-action?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        action: 'confirm',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al confirmar orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error confirming order:", error);
    return { success: false, error: "Error al confirmar la orden" };
  }
}

/**
 * Acción rápida: Marcar como preparando
 */
export async function quickStartPreparation(
  workspaceId: string,
  orderId: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/quick-action?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        action: 'start_preparation',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al iniciar preparación" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error starting preparation:", error);
    return { success: false, error: "Error al iniciar preparación" };
  }
}

/**
 * Acción rápida: Marcar como listo para envío
 */
export async function quickMarkReady(
  workspaceId: string,
  orderId: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/quick-action?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        action: 'mark_ready',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al marcar como listo" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error marking ready:", error);
    return { success: false, error: "Error al marcar como listo" };
  }
}

/**
 * Acción rápida: Marcar como enviado
 */
export async function quickMarkShipped(
  workspaceId: string,
  orderId: string,
  trackingNumber?: string,
  courierId?: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/quick-action?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        action: 'mark_shipped',
        tracking_number: trackingNumber,
        courier_id: courierId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al marcar como enviado" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error marking shipped:", error);
    return { success: false, error: "Error al marcar como enviado" };
  }
}

/**
 * Acción rápida: Marcar como entregado
 */
export async function quickMarkDelivered(
  workspaceId: string,
  orderId: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/operations/quick-action?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        order_id: orderId,
        action: 'mark_delivered',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al marcar como entregado" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/operations`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error marking delivered:", error);
    return { success: false, error: "Error al marcar como entregado" };
  }
}

/**
 * Obtiene órdenes urgentes o retrasadas
 */
export async function getUrgentOrders(
  workspaceId: string
): Promise<Result<Order[]>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/operations/urgent?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener órdenes urgentes" };
    }

    const orders = await response.json();
    return { success: true, data: orders };
  } catch (error: any) {
    logger.error("Error fetching urgent orders:", error);
    return { success: false, error: "Error al cargar órdenes urgentes" };
  }
}
