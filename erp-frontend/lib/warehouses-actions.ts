"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types";

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export async function getWarehouses(workspaceId: string): Promise<Result<Warehouse[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses?workspaceId=${workspaceId}`, {
      headers,
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener almacenes" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching warehouses:", error);
    return { success: false, error: "Error de conexión al servidor" };
  }
}

export async function createWarehouse(
  workspaceId: string,
  data: { name: string; address?: string }
): Promise<Result<Warehouse>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear almacén" };
    }

    const result = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/settings/warehouses`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("Error creating warehouse:", error);
    return { success: false, error: "Error de conexión al servidor" };
  }
}

export async function updateWarehouse(
  id: string,
  workspaceId: string,
  data: { name?: string; address?: string; is_active?: boolean }
): Promise<Result<Warehouse>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar almacén" };
    }

    const result = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/settings/warehouses`);
    return { success: true, data: result };
  } catch (error) {
    logger.error("Error updating warehouse:", error);
    return { success: false, error: "Error de conexión al servidor" };
  }
}

export async function deleteWarehouse(id: string, workspaceId: string): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar almacén" };
    }

    revalidatePath(`/workspaces/${workspaceId}/settings/warehouses`);
    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Error deleting warehouse:", error);
    return { success: false, error: "Error de conexión al servidor" };
  }
}
