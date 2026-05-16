"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types/api";

import {
  PurchaseOrder,
  PurchaseFilters,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  ReceiveItemsData,
  PurchaseStats,
  PurchaseStatus
} from "@/types/purchase";

// ==================== PURCHASE ORDER CRUD ====================

/**
 * Obtiene la lista de órdenes de compra
 */
export async function getPurchaseOrders(
  workspaceId: string,
  filters?: PurchaseFilters
): Promise<Result<{ data: PurchaseOrder[]; meta: { total: number; page: number; limit: number; totalPages: number } }>> {
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

    if (filters?.supplier_id) {
      params.append('supplier_id', filters.supplier_id);
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

    const response = await fetch(`${API_URL}/purchases?${params.toString()}`, {
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
    logger.error("Error fetching purchase orders:", error);
    return { success: false, error: "Error al cargar las órdenes de compra" };
  }
}

/**
 * Obtiene una orden de compra por su ID
 */
export async function getPurchaseOrder(
  purchaseId: string,
  workspaceId: string
): Promise<Result<PurchaseOrder>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/purchases/${purchaseId}?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Orden de compra no encontrada" };
      }
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener orden" };
    }

    const order = await response.json();
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error fetching purchase order:", error);
    return { success: false, error: "Error al cargar la orden de compra" };
  }
}

/**
 * Crea una nueva orden de compra
 */
export async function createPurchaseOrder(
  workspaceId: string,
  data: CreatePurchaseOrderData
): Promise<Result<PurchaseOrder>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/purchases?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/purchases`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error creating purchase order:", error);
    return { success: false, error: "Error al crear la orden de compra" };
  }
}

/**
 * Actualiza una orden de compra existente
 */
export async function updatePurchaseOrder(
  purchaseId: string,
  workspaceId: string,
  data: UpdatePurchaseOrderData
): Promise<Result<PurchaseOrder>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/purchases/${purchaseId}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/purchases`);
    revalidatePath(`/workspaces/${workspaceId}/purchases/${purchaseId}`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error updating purchase order:", error);
    return { success: false, error: "Error al actualizar la orden de compra" };
  }
}

/**
 * Elimina una orden de compra
 */
export async function deletePurchaseOrder(
  purchaseId: string,
  workspaceId: string
): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/purchases/${purchaseId}?workspaceId=${workspaceId}`,
      { method: "DELETE", headers }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar orden" };
    }

    revalidatePath(`/workspaces/${workspaceId}/purchases`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error deleting purchase order:", error);
    return { success: false, error: "Error al eliminar la orden de compra" };
  }
}

// ==================== ACCIONES ====================

/**
 * Cambia el estado de una orden a 'ordered'
 */
export async function submitPurchaseOrder(
  purchaseId: string,
  workspaceId: string
): Promise<Result<PurchaseOrder>> {
  return updatePurchaseOrder(purchaseId, workspaceId, { status: 'ORDERED' });
}

/**
 * Cancela una orden de compra
 */
export async function cancelPurchaseOrder(
  purchaseId: string,
  workspaceId: string,
  reason?: string
): Promise<Result<PurchaseOrder>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/purchases/${purchaseId}/cancel?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        reason,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al cancelar orden" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/purchases`);
    revalidatePath(`/workspaces/${workspaceId}/purchases/${purchaseId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error cancelling purchase order:", error);
    return { success: false, error: "Error al cancelar la orden" };
  }
}

/**
 * Recibe mercadería de una orden de compra
 */
export async function receivePurchaseItems(
  purchaseId: string,
  workspaceId: string,
  data: ReceiveItemsData
): Promise<Result<PurchaseOrder>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}/purchases/${purchaseId}/receive?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        items: data.items,
        notes: data.notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al recibir mercadería" };
    }

    const order = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/purchases`);
    revalidatePath(`/workspaces/${workspaceId}/purchases/${purchaseId}`);
    revalidatePath(`/workspaces/${workspaceId}/inventory`);
    revalidatePath(`/workspaces/${workspaceId}/products`);
    revalidatePath(`/workspaces/${workspaceId}`);
    return { success: true, data: order };
  } catch (error: any) {
    logger.error("Error receiving items:", error);
    return { success: false, error: "Error al recibir la mercadería" };
  }
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas de compras
 */
export async function getPurchaseStats(
  workspaceId: string
): Promise<Result<PurchaseStats>> {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(
      `${API_URL}/purchases/stats?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching purchase stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}

