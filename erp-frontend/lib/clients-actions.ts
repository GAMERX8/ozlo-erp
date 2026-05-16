"use server";

import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";
import { revalidatePath } from "next/cache";
import type { Result } from "@/types";
import { logger } from "./logger";

// ==================== CLIENTS ====================

export async function getClients(workspaceId: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener clientes" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching clients:", error);
    return { success: false, error: "Error al cargar clientes" };
  }
}

export async function getClient(workspaceId: string, id: string): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${id}?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener cliente" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching client:", error);
    return { success: false, error: "Error al cargar cliente" };
  }
}

export async function createClient(workspaceId: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear cliente" };
    }

    const client = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/clients`);
    return { success: true, data: client };
  } catch (error) {
    logger.error("Error creating client:", error);
    return { success: false, error: "Error al crear cliente" };
  }
}

export async function updateClient(workspaceId: string, id: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar cliente" };
    }

    const client = await response.json();
    revalidatePath(`/workspaces/${workspaceId}/clients`);
    return { success: true, data: client };
  } catch (error) {
    logger.error("Error updating client:", error);
    return { success: false, error: "Error al actualizar cliente" };
  }
}

export async function deleteClient(workspaceId: string, id: string): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar cliente" };
    }

    revalidatePath(`/workspaces/${workspaceId}/clients`);
    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Error deleting client:", error);
    return { success: false, error: "Error al eliminar cliente" };
  }
}

// ==================== CATEGORIES ====================

export async function getCategories(workspaceId: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/categories?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener categorias" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching categories:", error);
    return { success: false, error: "Error al cargar categorias" };
  }
}

export async function createCategory(workspaceId: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/categories?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear categoria" };
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    logger.error("Error creating category:", error);
    return { success: false, error: "Error al crear categoria" };
  }
}

export async function updateCategory(workspaceId: string, id: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/categories/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar categoria" };
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    logger.error("Error updating category:", error);
    return { success: false, error: "Error al actualizar categoria" };
  }
}

export async function deleteCategory(workspaceId: string, id: string): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/categories/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar categoria" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Error deleting category:", error);
    return { success: false, error: "Error al eliminar categoria" };
  }
}

// ==================== WAREHOUSES ====================

export async function getWarehouses(workspaceId: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener almacenes" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching warehouses:", error);
    return { success: false, error: "Error al cargar almacenes" };
  }
}

export async function createWarehouse(workspaceId: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses?workspaceId=${workspaceId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al crear almacen" };
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    logger.error("Error creating warehouse:", error);
    return { success: false, error: "Error al crear almacen" };
  }
}

export async function updateWarehouse(workspaceId: string, id: string, data: Record<string, any>): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses/${id}?workspaceId=${workspaceId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al actualizar almacen" };
    }

    return { success: true, data: await response.json() };
  } catch (error) {
    logger.error("Error updating warehouse:", error);
    return { success: false, error: "Error al actualizar almacen" };
  }
}

export async function deleteWarehouse(workspaceId: string, id: string): Promise<Result<void>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/warehouses/${id}?workspaceId=${workspaceId}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Error al eliminar almacen" };
    }

    return { success: true, data: undefined };
  } catch (error) {
    logger.error("Error deleting warehouse:", error);
    return { success: false, error: "Error al eliminar almacen" };
  }
}

// ==================== PRODUCTS ====================

export async function getProducts(workspaceId: string, categoryId?: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_URL}/products?workspaceId=${workspaceId}`;
    if (categoryId) url += `&categoryId=${categoryId}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener productos" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching products:", error);
    return { success: false, error: "Error al cargar productos" };
  }
}

export async function getProduct(workspaceId: string, id: string): Promise<Result<any>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/products/${id}?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener producto" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching product:", error);
    return { success: false, error: "Error al cargar producto" };
  }
}

export async function createProduct(workspaceId: string, data: Record<string, any>): Promise<Result<any>> {
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
  } catch (error) {
    logger.error("Error creating product:", error);
    return { success: false, error: "Error al crear producto" };
  }
}

export async function updateProduct(workspaceId: string, id: string, data: Record<string, any>): Promise<Result<any>> {
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
  } catch (error) {
    logger.error("Error updating product:", error);
    return { success: false, error: "Error al actualizar producto" };
  }
}

export async function deleteProduct(workspaceId: string, id: string): Promise<Result<void>> {
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
  } catch (error) {
    logger.error("Error deleting product:", error);
    return { success: false, error: "Error al eliminar producto" };
  }
}

// ==================== INVENTORY / KARDEX ====================

export async function getKardex(workspaceId: string, productId: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/kardex/${productId}?workspaceId=${workspaceId}`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener kardex" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching kardex:", error);
    return { success: false, error: "Error al cargar kardex" };
  }
}

export async function getLowStockAlerts(workspaceId: string, threshold?: number): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    let url = `${API_URL}/workspaces/${workspaceId}/inventory/low-stock`;
    if (threshold) url += `?threshold=${threshold}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener alertas de stock bajo" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching low stock alerts:", error);
    return { success: false, error: "Error al cargar alertas de stock" };
  }
}

export async function getProductStockByWarehouse(productId: string): Promise<Result<any[]>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/product/${productId}/by-warehouse`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener stock por almacén" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching stock by warehouse:", error);
    return { success: false, error: "Error al cargar stock por almacén" };
  }
}

export async function getProductTotalStock(productId: string): Promise<Result<number>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/inventory/product/${productId}/total`, { headers });

    if (!response.ok) {
      return { success: false, error: "Error al obtener stock total" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    logger.error("Error fetching total stock:", error);
    return { success: false, error: "Error al cargar stock total" };
  }
}