import { useState, useCallback } from 'react';
import { getCategories, getWarehouses, getProducts, getKardex, createProduct, updateProduct, createBulkProducts } from '@/lib/clients-actions';
import type { Product, Category, Warehouse, StockMovement } from '../types/logistics';

export function useLogistics(workspaceId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!workspaceId) return [];
    setLoading(true);
    try {
      const result = await getCategories(workspaceId);
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Error al obtener categorias');
      return [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchWarehouses = useCallback(async () => {
    if (!workspaceId) return [];
    setLoading(true);
    try {
      const result = await getWarehouses(workspaceId);
      if (result.success) {
        return (result.data || []).filter((w: any) => w.is_active !== false);
      }
      setError(result.error || 'Error al obtener almacenes');
      return [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchProducts = useCallback(async (categoryId?: string) => {
    if (!workspaceId) return [];
    setLoading(true);
    try {
      const result = await getProducts(workspaceId, categoryId);
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Error al obtener productos');
      return [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchKardex = useCallback(async (productId: string) => {
    if (!workspaceId) return [];
    setLoading(true);
    try {
      const result = await getKardex(workspaceId, productId);
      if (result.success) {
        return result.data;
      }
      setError(result.error || 'Error al obtener Kardex');
      return [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const handleCreateProduct = async (data: any) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    const result = await createProduct(workspaceId, data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create product');
    }
    return result.data;
  };

  const handleCreateBulkProducts = async (data: any[]) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    const result = await createBulkProducts(workspaceId, data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to bulk create products');
    }
    return result.data;
  };

  const handleUpdateProduct = async (id: string, data: any) => {
    if (!workspaceId) throw new Error('Workspace ID is required');
    const result = await updateProduct(workspaceId, id, data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update product');
    }
    return result.data;
  };

  return {
    loading,
    error,
    fetchCategories,
    fetchWarehouses,
    fetchProducts,
    fetchKardex,
    createProduct: handleCreateProduct,
    createBulkProducts: handleCreateBulkProducts,
    updateProduct: handleUpdateProduct,
  };
}