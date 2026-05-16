"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { 
  Order, 
  PaginatedOrders, 
  OrderFilters,
  CreateOrderData,
  UpdateOrderData,
  UpdateOrderStatusData,
  BulkUpdateStatusData,
  OrderStats
} from "@/types/order";
import type { Result } from "@/types/api";

// ==================== ORDERS CRUD ====================

/**
 * Obtiene la lista de órdenes con filtros y paginación
 */
export async function getOrders(
  workspaceId: string,
  filters?: OrderFilters
): Promise<Result<PaginatedOrders>> {
  try {
    const headers = await getAuthHeaders();
    
    // Construir query params
    const params = new URLSearchParams();
    params.append('workspaceId', workspaceId);
    
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status', s));
      } else {
        params.append('status', filters.status);
      }
    }
    
    if (filters?.sales_channel) {
      if (Array.isArray(filters.sales_channel)) {
        filters.sales_channel.forEach(c => params.append('sales_channel', c));
      } else {
        params.append('sales_channel', filters.sales_channel);
      }
    }
    
    if (filters?.payment_status) {
      params.append('payment_status', filters.payment_status);
    }
    
    if (filters?.client_id) {
      params.append('client_id', filters.client_id);
    }
    
    if (filters?.courier_id) {
      params.append('courier_id', filters.courier_id);
    }
    
    if (filters?.date_from) {
      params.append('date_from', filters.date_from);
    }
    
    if (filters?.date_to) {
      params.append('date_to', filters.date_to);
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
    
    const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener órdenes" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error fetching orders:", error);
    return { success: false, error: "Error al cargar las órdenes" };
  }
}

/**
 * Obtiene una orden por su ID
 */
export async function getOrder(
  orderId: string,
  workspaceId: string
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/orders/${orderId}?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Orden no encontrada" };
      }
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener orden" };
    }

    const order = await response.json();
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error fetching order:", error);
    return { success: false, error: "Error al cargar la orden" };
  }
}

/**
 * Crea una nueva orden
 */
export async function createOrder(
  workspaceId: string,
  data: CreateOrderData
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams({ workspaceId });
    
    const response = await fetch(`${API_URL}/orders?${params.toString()}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/sales`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error creating order:", error);
    return { success: false, error: "Error al crear la orden" };
  }
}

/**
 * Actualiza una orden existente
 */
export async function updateOrder(
  orderId: string,
  workspaceId: string,
  data: UpdateOrderData
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        ...data,
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/sales`);
    revalidatePath(`/workspaces/${workspaceId}/sales/${orderId}`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error updating order:", error);
    return { success: false, error: "Error al actualizar la orden" };
  }
}

/**
 * Actualiza el estado de una orden
 */
export async function updateOrderStatus(
  orderId: string,
  workspaceId: string,
  data: UpdateOrderStatusData
): Promise<Result<Order>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/orders/${orderId}/status?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar estado" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/sales`);
    revalidatePath(`/workspaces/${workspaceId}/sales/${orderId}`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error updating order status:", error);
    return { success: false, error: "Error al actualizar el estado" };
  }
}

/**
 * Actualiza el estado de múltiples órdenes
 */
export async function bulkUpdateStatus(
  workspaceId: string,
  data: BulkUpdateStatusData
): Promise<Result<{ updated: number }>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/orders/bulk/status?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar órdenes" };
    }

    const result = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/sales`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    return { success: true, data: result };
  } catch (error: any) {
    logger.error("Error bulk updating orders:", error);
    return { success: false, error: "Error al actualizar las órdenes" };
  }
}

/**
 * Elimina una orden
 */
export async function deleteOrder(
  orderId: string,
  workspaceId: string
): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/orders/${orderId}?workspaceId=${workspaceId}`,
      { method: "DELETE", headers }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar orden" };
    }

    revalidatePath(`/workspaces/${workspaceId}/sales`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error deleting order:", error);
    return { success: false, error: "Error al eliminar la orden" };
  }
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas de órdenes
 */
export async function getOrderStats(
  workspaceId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<Result<OrderStats>> {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams();
    params.append('workspaceId', workspaceId);
    
    if (dateFrom) {
      params.append('startDate', dateFrom);
    }
    
    if (dateTo) {
      params.append('endDate', dateTo);
    }
    
    const response = await fetch(`${API_URL}/orders/stats/summary?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching order stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}

// ==================== COURIERS ====================

/**
 * Obtiene la lista de couriers disponibles
 */
export async function getCouriers(
  workspaceId: string
): Promise<Result<{ id: string; name: string; phone?: string; is_active: boolean }[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/couriers?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener couriers" };
    }

    const couriers = await response.json();
    return { success: true, data: couriers };
  } catch (error: any) {
    logger.error("Error fetching couriers:", error);
    return { success: false, error: "Error al cargar los couriers" };
  }
}
