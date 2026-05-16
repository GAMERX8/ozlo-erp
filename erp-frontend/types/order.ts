/**
 * Tipos para el módulo de ventas y órdenes
 */

// ==================== ENUMS ====================

export type OrderStatus =
  | "NO_CONFIRMED"
  | "CONTACTED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type SalesChannel =
  | 'FACEBOOK'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'OTHER';

export type DeliveryType = 'DELIVERY' | 'PICKUP';

export type RegionType = 'LIMA' | 'PROVINCE';

export type PaymentMethod =
  | 'CASH'
  | 'YAPE'
  | 'PLIN'
  | 'TRANSFER'
  | 'CARD'
  | 'DEPOSIT'
  | 'CASH_ON_DELIVERY';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

// ==================== INTERFACES PRINCIPALES ====================

export interface Order {
  id: string;
  order_number: string;
  workspace_id: string;
  client_id: string;
  client?: Client;
  status: OrderStatus;
  sales_channel: SalesChannel;
  delivery_type: DeliveryType;
  region: RegionType;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  advance_amount: number;
  total_amount: number;
  shipping_cost: number;
  discount_amount: number;
  notes?: string;
  internal_notes?: string;
  courier_id?: string;
  courier?: Courier;
  tracking_number?: string;
  shipping_address?: string;
  shipping_reference?: string;
  estimated_delivery_date?: string;
  delivered_at?: string;
  created_by?: string;
  created_by_user?: OrderUser;
  items: OrderItem[];
  status_history?: StatusHistory[];
  date_created: string;
  date_updated: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: OrderProduct;
  variant_id?: string;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  notes?: string;
  date_created: string;
}

export interface OrderProduct {
  id: string;
  name: string;
  sku?: string;
  price: number;
  workspace_id: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price_adjustment: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  workspace_id: string;
}

export interface Courier {
  id: string;
  name: string;
  phone?: string;
  is_active: boolean;
  workspace_id: string;
}

export interface OrderUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

export interface StatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  previous_status?: OrderStatus;
  notes?: string;
  created_by: string;
  created_by_user?: OrderUser;
  date_created: string;
}

// ==================== DTOs PARA CREAR/ACTUALIZAR ====================

export interface CreateOrderData {
  client_id: string;
  channel: SalesChannel;
  delivery_type: DeliveryType;
  delivery_region: RegionType;
  payment_method: PaymentMethod;
  advance_payment?: number;
  notes?: string;
  internal_notes?: string;
  courier_id?: string;
  items: CreateOrderItemData[];
}

export interface CreateOrderItemData {
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  notes?: string;
}

export interface UpdateOrderData {
  client_id?: string;
  sales_channel?: SalesChannel;
  delivery_type?: DeliveryType;
  region?: RegionType;
  payment_method?: PaymentMethod;
  advance_amount?: number;
  notes?: string;
  internal_notes?: string;
  shipping_address?: string;
  shipping_reference?: string;
  estimated_delivery_date?: string;
  courier_id?: string;
  tracking_number?: string;
  items?: UpdateOrderItemData[];
}

export interface UpdateOrderItemData {
  id?: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  notes?: string;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
  notes?: string;
  courier_id?: string;
  tracking_number?: string;
}

export interface BulkUpdateStatusData {
  order_ids: string[];
  status: OrderStatus;
  notes?: string;
  courier_id?: string;
}

// ==================== FILTROS Y PAGINACIÓN ====================

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  sales_channel?: SalesChannel | SalesChannel[];
  payment_status?: PaymentStatus;
  client_id?: string;
  courier_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedOrders {
  data: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== ESTADÍSTICAS ====================

export interface OrderStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  by_status: Record<OrderStatus, number>;
  by_channel: Record<SalesChannel, number>;
  daily_stats: {
    date: string;
    orders: number;
    amount: number;
  }[];
}

// ==================== CONFIGURACIÓN ====================

export interface OrderConfig {
  statuses: {
    value: OrderStatus;
    label: string;
    color: string;
    description: string;
  }[];
  sales_channels: {
    value: SalesChannel;
    label: string;
    icon: string;
    color: string;
  }[];
  delivery_types: {
    value: DeliveryType;
    label: string;
    icon: string;
  }[];
  payment_methods: {
    value: PaymentMethod;
    label: string;
    icon: string;
  }[];
}

// ==================== HELPERS ====================

export const orderStatusLabels: Record<OrderStatus, string> = {
  NO_CONFIRMED: 'No Confirmado',
  CONTACTED: 'Contactado',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  READY: 'Listo',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  RETURNED: 'Devuelto',
};

export const orderStatusColors: Record<OrderStatus, string> = {
  NO_CONFIRMED: 'bg-yellow-500',
  CONTACTED: 'bg-blue-400',
  CONFIRMED: 'bg-blue-600',
  PREPARING: 'bg-purple-500',
  READY: 'bg-indigo-500',
  SHIPPED: 'bg-blue-700',
  DELIVERED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
  RETURNED: 'bg-orange-500',
};

export const orderStatusBadgeVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NO_CONFIRMED: 'secondary',
  CONTACTED: 'default',
  CONFIRMED: 'default',
  PREPARING: 'secondary',
  READY: 'secondary',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
};

export const salesChannelLabels: Record<SalesChannel, string> = {
  FACEBOOK: 'Facebook',
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  OTHER: 'Otro',
};

export const deliveryTypeLabels: Record<DeliveryType, string> = {
  DELIVERY: 'Delivery',
  PICKUP: 'Recojo',
};

export const regionLabels: Record<RegionType, string> = {
  LIMA: 'Lima',
  PROVINCE: 'Provincia',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  DEPOSIT: 'Depósito',
  CASH_ON_DELIVERY: 'Pago Contraentrega',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
};

