export interface Category {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock: number;
  warehouse: Warehouse;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  cost?: number;
  min_stock: number;
  category_id?: string;
  unit: string;
  status: string;
  gallery?: any;
  workspace_id: string;
  category?: Category;
  inventory: Inventory[];
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  reason?: string;
  reference_id?: string;
  warehouse: Warehouse;
  date_created: string;
}
