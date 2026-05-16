"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types/api";

export interface Courier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  document_type?: string;
  document_number?: string;
  vehicle_type?: string;
  license_plate?: string;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourierStats {
  courier_id: string;
  total_orders: number;
  delivered_orders: number;
  in_transit_orders?: number;
  pending_orders: number;
  delivery_rate: number;
  avg_delivery_time?: string;
}

export interface CreateCourierData {
  name: string;
  phone?: string;
  email?: string;
  document_type?: string;
  document_number?: string;
  vehicle_type?: string;
  license_plate?: string;
}

export interface UpdateCourierData {
  name?: string;
  phone?: string;
  email?: string;
  document_type?: string;
  document_number?: string;
  vehicle_type?: string;
  license_plate?: string;
  is_active?: boolean;
}

// ==================== COURIER CRUD ====================

/**
 * Obtiene la lista de couriers del workspace
 */
export async function getCouriers(
  workspaceId: string
): Promise<Result<Courier[]>> {
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

/**
 * Obtiene un courier por su ID
 */
export async function getCourier(
  courierId: string,
  workspaceId: string
): Promise<Result<Courier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/couriers/${courierId}?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Courier no encontrado" };
      }
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener courier" };
    }

    const courier = await response.json();
    return { success: true, data: courier };
  } catch (error: any) {
    logger.error("Error fetching courier:", error);
    return { success: false, error: "Error al cargar el courier" };
  }
}

/**
 * Crea un nuevo courier
 */
export async function createCourier(
  workspaceId: string,
  data: CreateCourierData
): Promise<Result<Courier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/couriers?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear courier" };
    }

    const courier = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/couriers`);
    return { success: true, data: courier };
  } catch (error: any) {
    logger.error("Error creating courier:", error);
    return { success: false, error: "Error al crear el courier" };
  }
}

/**
 * Actualiza un courier existente
 */
export async function updateCourier(
  courierId: string,
  workspaceId: string,
  data: UpdateCourierData
): Promise<Result<Courier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/couriers/${courierId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        ...data,
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar courier" };
    }

    const courier = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/couriers`);
    return { success: true, data: courier };
  } catch (error: any) {
    logger.error("Error updating courier:", error);
    return { success: false, error: "Error al actualizar el courier" };
  }
}

/**
 * Elimina un courier
 */
export async function deleteCourier(
  courierId: string,
  workspaceId: string
): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/couriers/${courierId}?workspaceId=${workspaceId}`,
      { method: "DELETE", headers }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar courier" };
    }

    revalidatePath(`/workspaces/${workspaceId}/couriers`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error deleting courier:", error);
    return { success: false, error: "Error al eliminar el courier" };
  }
}

// ==================== ESTADÍSTICAS ====================

/**
 * Obtiene estadísticas de un courier
 */
export async function getCourierStats(
  courierId: string,
  workspaceId: string
): Promise<Result<CourierStats>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/couriers/${courierId}/stats?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching courier stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}

/**
 * Obtiene estadísticas de todos los couriers
 */
export async function getAllCouriersStats(
  workspaceId: string
): Promise<Result<CourierStats[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/couriers/stats/all?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener estadísticas" };
    }

    const stats = await response.json();
    return { success: true, data: stats };
  } catch (error: any) {
    logger.error("Error fetching couriers stats:", error);
    return { success: false, error: "Error al cargar las estadísticas" };
  }
}

/**
 * Obtiene órdenes asignadas a un courier
 */
export async function getCourierOrders(
  courierId: string,
  workspaceId: string,
  status?: string
): Promise<Result<{ id: string; order_number: string; status: string; client_name: string; address: string }[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams();
    params.append('workspaceId', workspaceId);
    if (status) params.append('status', status);
    
    const response = await fetch(
      `${API_URL}/couriers/${courierId}/orders?${params.toString()}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener órdenes" };
    }

    const orders = await response.json();
    return { success: true, data: orders };
  } catch (error: any) {
    logger.error("Error fetching courier orders:", error);
    return { success: false, error: "Error al cargar las órdenes" };
  }
}
