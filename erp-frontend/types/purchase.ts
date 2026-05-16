export type PurchaseStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier?: {
    id: string;
    name: string;
    contact_name?: string;
    phone?: string;
  };
  warehouse_id: string;
  warehouse?: {
    id: string;
    name: string;
  };
  status: PurchaseStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  final_amount: number;
  notes?: string;
  invoice_number?: string;
  invoice_url?: string;
  expected_date?: string;
  received_date?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
  };
  variant_id?: string;
  variant?: {
    id: string;
    sku_variant?: string;
    attributes?: any;
  };
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  subtotal: number;
}

export interface CreatePurchaseOrderData {
  supplier_id: string;
  warehouse_id: string;
  expected_date?: string;
  invoice_number?: string;
  notes?: string;
  items: CreatePurchaseOrderItemData[];
}

export interface CreatePurchaseOrderItemData {
  product_id: string;
  variant_id?: string;
  quantity_ordered: number;
  unit_cost: number;
}

export interface UpdatePurchaseOrderData {
  supplier_id?: string;
  warehouse_id?: string;
  status?: string;
  expected_date?: string;
  invoice_number?: string;
  notes?: string;
}

export interface ReceiveItemsData {
  items: {
    item_id: string;
    quantity_received: number;
  }[];
  notes?: string; // This corresponds to invoice_url or additional info in backend
}

export interface PurchaseFilters {
  status?: PurchaseStatus | PurchaseStatus[];
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseStats {
  totalPurchases: number;
  totalAmount: number;
  byStatus: {
    status: string;
    _count: { status: number };
    _sum: { total_amount: number };
  }[];
}

export const purchaseStatusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  ORDERED: 'Ordenado',
  PARTIAL: 'Parcial',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
  draft: 'Borrador',
  ordered: 'Ordenado',
  partial: 'Parcial',
  received: 'Recibido',
  cancelled: 'Cancelado',
};

export const purchaseStatusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: 'secondary',
  ORDERED: 'default',
  PARTIAL: 'secondary',
  RECEIVED: 'default',
  CANCELLED: 'destructive',
  draft: 'secondary',
  ordered: 'default',
  partial: 'secondary',
  received: 'default',
  cancelled: 'destructive',
};

