"use server";

import { revalidatePath } from "next/cache";
import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { logger } from "./logger";
import type { Result } from "@/types";

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  base_price: number;
  category_id: string | null;
  category_name?: string;
  status: string;
  created_at: string;
  updated_at: string;
  stock?: number;
}

export async function getProducts(workspaceId: string, query?: string): Promise<Result<Product[]>> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_URL}/products?workspaceId=${workspaceId}`;
    if (query) {
      url += `&search=${encodeURIComponent(query)}`;
    }
    
    const response = await fetch(url, { headers, next: { tags: ["products"] } });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener productos" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in getProducts:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function getProduct(id: string, workspaceId: string): Promise<Result<Product>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/products/${id}?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al obtener producto" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    logger.error("Error in getProduct:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function createProduct(workspaceId: string, data: any): Promise<Result<Product>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/products?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear producto" };
    }

    const product = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/products`);
    return { success: true, data: product };
  } catch (error: any) {
    logger.error("Error in createProduct:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function updateProduct(id: string, workspaceId: string, data: any): Promise<Result<Product>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/products/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar producto" };
    }

    const product = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/products`);
    return { success: true, data: product };
  } catch (error: any) {
    logger.error("Error in updateProduct:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function deleteProduct(id: string, workspaceId: string): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/products/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar producto" };
    }

    revalidatePath(`/workspaces/${workspaceId}/products`);
    return { success: true, data: undefined };
  } catch (error: any) {
    logger.error("Error in deleteProduct:", error);
    return { success: false, error: "Error de conexión" };
  }
}
