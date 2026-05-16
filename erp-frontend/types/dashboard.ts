/**
 * Tipos para el módulo de dashboards y métricas
 */

import { OrderStatus, SalesChannel, RegionType } from "./order";

// ==================== KPIs Y MÉTRICAS PRINCIPALES ====================

export interface DashboardKPIs {
  dailySales: {
    amount: number;
    change: number; // Porcentaje de cambio vs día anterior
    orders: number;
  };
  pendingOrders: {
    count: number;
    urgent: number; // Órdenes pendientes por más de 24h
  };
  averageTicket: {
    amount: number;
    change: number;
  };
  deliveryRate: {
    rate: number; // Porcentaje
    change: number;
  };
}

// ==================== GRÁFICOS Y ESTADÍSTICAS ====================

export interface DailySalesData {
  date: string;
  amount: number;
  orders: number;
}

export interface OrdersByStatus {
  status: OrderStatus;
  count: number;
  amount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku?: string;
  sold_quantity: number;
  total_revenue: number;
  image_url?: string;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  client_name: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}

export interface LowStockAlert {
  id: string;
  name: string;
  sku?: string;
  current_stock: number;
  min_stock: number;
  warehouse_name?: string;
}

// ==================== ANÁLISIS DE VENTAS ====================

export interface SalesAnalytics {
  totalSales: {
    amount: number;
    change: number;
    orders: number;
  };
  averageOrderValue: {
    amount: number;
    change: number;
  };
  salesByChannel: {
    channel: SalesChannel;
    amount: number;
    orders: number;
    percentage: number;
  }[];
  salesByRegion: {
    region: RegionType;
    amount: number;
    orders: number;
    percentage: number;
  }[];
  salesOverTime: DailySalesData[];
  topProducts: TopProduct[];
}

// ==================== ANÁLISIS DE INVENTARIO ====================

export interface InventoryAnalytics {
  totalValue: number;
  totalProducts: number;
  totalVariants: number;
  lowStockProducts: LowStockAlert[];
  lowStockCount: number;
  turnover: {
    rate: number; // Rotación mensual
    change: number;
  };
  recentMovements: InventoryMovement[];
  stockDistribution: {
    category: string;
    count: number;
    value: number;
  }[];
}

export interface InventoryMovement {
  id: string;
  product_name: string;
  sku?: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason?: string;
  created_at: string;
  created_by: string;
}

// ==================== ANÁLISIS DE OPERACIONES ====================

export interface OperationsAnalytics {
  ordersByStatus: OrdersByStatus[];
  averageTimeByStatus: {
    status: OrderStatus;
    average_hours: number;
    count: number;
  }[];
  courierPerformance: {
    courier_id: string;
    courier_name: string;
    total_orders: number;
    delivered_orders: number;
    delivery_rate: number;
    average_delivery_hours: number;
  }[];
  returnRate: {
    rate: number;
    total_returns: number;
    total_orders: number;
    change: number;
  };
  pipelineVelocity: {
    avg_total_hours: number;
    change: number;
  };
}

// ==================== FILTROS DE FECHA ====================

export type DateRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeFilter {
  range: DateRange;
  from?: string;
  to?: string;
}

// ==================== RESPUESTAS DE API ====================

export interface DashboardData {
  kpis: DashboardKPIs;
  salesOverTime: DailySalesData[];
  ordersByStatus: OrdersByStatus[];
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  lowStockAlerts: LowStockAlert[];
}

export interface AnalyticsOverview {
  sales: SalesAnalytics;
  inventory: InventoryAnalytics;
  operations: OperationsAnalytics;
}

// ==================== CONFIGURACIÓN DE GRÁFICOS ====================

export interface ChartConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

// ==================== HELPERS ====================

export const dateRangeLabels: Record<DateRange, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
  custom: "Personalizado",
};

export interface TabConfig {
  value: string;
  label: string;
  icon: string;
}
