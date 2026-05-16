"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types/api";

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  website?: string;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  website?: string;
}

export interface UpdateSupplierData {
  name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  website?: string;
  is_active?: boolean;
}

// ==================== SUPPLIER CRUD ====================

/**
 * Obtiene la lista de proveedores
 */
export async function getSuppliers(
  workspaceId: string,
  search?: string
): Promise<Result<Supplier[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const params = new URLSearchParams();
    params.append('workspaceId', workspaceId);
    if (search) params.append('search', search);
    
    const response = await fetch(
      `${API_URL}/suppliers?${params.toString()}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener proveedores" };
    }

    const suppliers = await response.json();
    return { success: true, data: suppliers };
  } catch (error: any) {
    logger.error("Error fetching suppliers:", error);
    return { success: false, error: "Error al cargar los proveedores" };
  }
}

/**
 * Obtiene un proveedor por su ID
 */
export async function getSupplier(
  supplierId: string,
  workspaceId: string
): Promise<Result<Supplier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/suppliers/${supplierId}?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Proveedor no encontrado" };
      }
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener proveedor" };
    }

    const supplier = await response.json();
    return { success: true, data: supplier };
  } catch (error: any) {
    logger.error("Error fetching supplier:", error);
    return { success: false, error: "Error al cargar el proveedor" };
  }
}

/**
 * Crea un nuevo proveedor
 */
export async function createSupplier(
  workspaceId: string,
  data: CreateSupplierData
): Promise<Result<Supplier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/suppliers?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear proveedor" };
    }

    const supplier = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/suppliers`);
    return { success: true, data: supplier };
  } catch (error: any) {
    logger.error("Error creating supplier:", error);
    return { success: false, error: "Error al crear el proveedor" };
  }
}

/**
 * Actualiza un proveedor existente
 */
export async function updateSupplier(
  supplierId: string,
  workspaceId: string,
  data: UpdateSupplierData
): Promise<Result<Supplier>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${API_URL}/suppliers/${supplierId}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar proveedor" };
    }

    const supplier = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/suppliers`);
    return { success: true, data: supplier };
  } catch (error: any) {
    logger.error("Error updating supplier:", error);
    return { success: false, error: "Error al actualizar el proveedor" };
  }
}

/**
 * Elimina un proveedor
 */
export async function deleteSupplier(
  supplierId: string,
  workspaceId: string
): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/suppliers/${supplierId}?workspaceId=${workspaceId}`,
      { method: "DELETE", headers }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar proveedor" };
    }

    revalidatePath(`/workspaces/${workspaceId}/suppliers`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error deleting supplier:", error);
    return { success: false, error: "Error al eliminar el proveedor" };
  }
}

/**
 * Obtiene productos de un proveedor
 */
export async function getSupplierProducts(
  supplierId: string,
  workspaceId: string
): Promise<Result<{ id: string; name: string; sku?: string; price: number }[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/suppliers/${supplierId}/products?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener productos" };
    }

    const products = await response.json();
    return { success: true, data: products };
  } catch (error: any) {
    logger.error("Error fetching supplier products:", error);
    return { success: false, error: "Error al cargar los productos" };
  }
}

/**
 * Obtiene órdenes de compra de un proveedor
 */
export async function getSupplierPurchaseOrders(
  supplierId: string,
  workspaceId: string
): Promise<Result<{ id: string; order_number: string; status: string; total_amount: number; created_at: string }[]>> {
  try {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${API_URL}/suppliers/${supplierId}/purchase-orders?workspaceId=${workspaceId}`,
      { headers, cache: 'no-store' }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener órdenes" };
    }

    const orders = await response.json();
    return { success: true, data: orders };
  } catch (error: any) {
    logger.error("Error fetching supplier orders:", error);
    return { success: false, error: "Error al cargar las órdenes" };
  }
}
