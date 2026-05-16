import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpis(workspaceId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue,
      totalOrders,
      monthlyOrders,
      totalClients,
      monthlyNewClients,
      totalProducts,
      pendingOrders,
      deliveredOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { workspace_id: workspaceId, status: 'DELIVERED' },
        _sum: { total_amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          workspace_id: workspaceId,
          status: 'DELIVERED',
          delivered_at: { gte: startOfMonth },
        },
        _sum: { total_amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          workspace_id: workspaceId,
          status: 'DELIVERED',
          delivered_at: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { total_amount: true },
      }),
      this.prisma.order.count({ where: { workspace_id: workspaceId } }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, date_created: { gte: startOfMonth } },
      }),
      this.prisma.client.count({ where: { workspace_id: workspaceId, status: 'active' } }),
      this.prisma.client.count({
        where: { workspace_id: workspaceId, date_created: { gte: startOfMonth } },
      }),
      this.prisma.product.count({ where: { workspace_id: workspaceId, status: 'active' } }),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: { in: ['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED'] },
        },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, status: 'DELIVERED' },
      }),
    ]);

    const monthlyRev = monthlyRevenue._sum.total_amount || 0;
    const lastMonthRev = lastMonthRevenue._sum.total_amount || 0;
    const revenueGrowth = lastMonthRev > 0 ? ((monthlyRev - lastMonthRev) / lastMonthRev) * 100 : monthlyRev > 0 ? 100 : 0;

    return {
      totalRevenue: totalRevenue._sum.total_amount || 0,
      monthlyRevenue: monthlyRev,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      totalOrders,
      monthlyOrders,
      totalClients,
      monthlyNewClients,
      totalProducts,
      pendingOrders,
      deliveredOrders,
    };
  }

  async getSalesOverTime(workspaceId: string, period: string = '30d') {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = 'week';
        break;
      case '12m':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
    }

    const orders = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'DELIVERED',
        delivered_at: { gte: startDate },
      },
      select: {
        total_amount: true,
        delivered_at: true,
      },
      orderBy: { delivered_at: 'asc' },
    });

    const grouped = new Map<string, { date: string; revenue: number; count: number }>();

    for (const order of orders) {
      const date = order.delivered_at;
      if (!date) continue;

      let key: string;
      const d = new Date(date);

      if (groupBy === 'day') {
        key = d.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = grouped.get(key) || { date: key, revenue: 0, count: 0 };
      existing.revenue += order.total_amount;
      existing.count += 1;
      grouped.set(key, existing);
    }

    return Array.from(grouped.values());
  }

  async getOrdersByStatus(workspaceId: string) {
    return this.prisma.order.groupBy({
      by: ['status'],
      where: { workspace_id: workspaceId },
      _count: { status: true },
      _sum: { total_amount: true },
    });
  }

  async getTopProducts(workspaceId: string, limit: number = 10) {
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['product_id'],
      where: {
        order: { workspace_id: workspaceId, status: 'DELIVERED' },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = topItems.map((item) => item.product_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, price: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topItems.map((item) => ({
      product: productMap.get(item.product_id) || { id: item.product_id, name: 'Unknown' },
      totalQuantity: item._sum.quantity || 0,
      totalRevenue: item._sum.subtotal || 0,
    }));
  }

  async getRecentOrders(workspaceId: string, limit: number = 10) {
    return this.prisma.order.findMany({
      where: { workspace_id: workspaceId },
      take: limit,
      orderBy: { date_created: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        items: { select: { id: true, product_name: true, quantity: true, unit_price: true } },
      },
    });
  }

  async getLowStockAlerts(workspaceId: string, threshold: number = 5) {
    return this.prisma.inventory.findMany({
      where: {
        product: { workspace_id: workspaceId, status: 'active' },
        stock: { lte: threshold },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, min_stock: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { stock: 'asc' },
    });
  }

  async getSalesAnalytics(workspaceId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const deliveredFilter = dateFilter.gte || dateFilter.lte
      ? { delivered_at: dateFilter }
      : {};

    const [
      revenueByChannel,
      revenueByRegion,
      revenueByPaymentMethod,
      averageOrderValue,
      conversionByChannel,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['channel'],
        where: { workspace_id: workspaceId, status: 'DELIVERED', ...deliveredFilter },
        _sum: { total_amount: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['delivery_region'],
        where: { workspace_id: workspaceId, status: 'DELIVERED', ...deliveredFilter },
        _sum: { total_amount: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['payment_method'],
        where: { workspace_id: workspaceId, status: 'DELIVERED', ...deliveredFilter },
        _sum: { total_amount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { workspace_id: workspaceId, status: 'DELIVERED', ...deliveredFilter },
        _avg: { total_amount: true },
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        where: { workspace_id: workspaceId, ...({ date_created: dateFilter.gte || dateFilter.lte ? dateFilter : undefined } as any) },
        _count: true,
      }),
    ]);

    return {
      revenueByChannel,
      revenueByRegion,
      revenueByPaymentMethod,
      averageOrderValue: averageOrderValue._avg.total_amount || 0,
      conversionByChannel,
    };
  }

  async getInventoryAnalytics(workspaceId: string) {
    const [
      totalProducts,
      activeProducts,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
      movementsLast30Days,
      stockByWarehouse,
    ] = await Promise.all([
      this.prisma.product.count({ where: { workspace_id: workspaceId } }),
      this.prisma.product.count({ where: { workspace_id: workspaceId, status: 'active' } }),
      this.prisma.inventory.aggregate({
        where: { product: { workspace_id: workspaceId, status: 'active' } },
        _sum: { stock: true },
      }),
      this.prisma.inventory.count({
        where: {
          product: { workspace_id: workspaceId, status: 'active' },
          stock: { lte: 5 },
        },
      }),
      this.prisma.inventory.count({
        where: {
          product: { workspace_id: workspaceId, status: 'active' },
          stock: { lte: 0 },
        },
      }),
      this.prisma.stockMovement.count({
        where: {
          product: { workspace_id: workspaceId },
          date_created: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.inventory.groupBy({
        by: ['warehouse_id'],
        where: { product: { workspace_id: workspaceId, status: 'active' } },
        _sum: { stock: true },
      }),
    ]);

    const warehouseIds = stockByWarehouse.map((s) => s.warehouse_id);
    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, name: true },
    });
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

    const totalCost = await this.prisma.product.aggregate({
      where: { workspace_id: workspaceId, status: 'active' },
      _sum: { cost: true },
    });

    const totalStock = await this.prisma.inventory.findMany({
      where: { product: { workspace_id: workspaceId, status: 'active' } },
      include: {
        product: { select: { id: true, name: true, cost: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    const inventoryValue = totalStock.reduce((sum, inv) => sum + inv.stock * (inv.product.cost || 0), 0);

    return {
      totalProducts,
      activeProducts,
      totalStockUnits: totalInventoryValue._sum.stock || 0,
      inventoryValue,
      lowStockCount,
      outOfStockCount,
      movementsLast30Days,
      stockByWarehouse: stockByWarehouse.map((s) => ({
        warehouseId: s.warehouse_id,
        warehouseName: warehouseMap.get(s.warehouse_id) || 'Unknown',
        totalStock: s._sum.stock || 0,
      })),
    };
  }

  async getOperationsAnalytics(workspaceId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      ordersByStatus,
      avgFulfillmentTime,
      courierPerformance,
      overdueOrders,
      pipelineVelocity,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { workspace_id: workspaceId },
        _count: true,
      }),
      this.getAvgFulfillmentTime(workspaceId),
      this.getCourierPerformance(workspaceId),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: { in: ['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING'] },
          date_created: { lt: thirtyDaysAgo },
        },
      }),
      this.getPipelineVelocity(workspaceId),
    ]);

    return {
      ordersByStatus,
      avgFulfillmentTime,
      courierPerformance,
      overdueOrders,
      pipelineVelocity,
    };
  }

  private async getAvgFulfillmentTime(workspaceId: string) {
    const delivered = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'DELIVERED',
        date_created: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        delivered_at: { not: null },
      },
      select: { date_created: true, delivered_at: true, channel: true },
    });

    if (delivered.length === 0) return { averageHours: 0, byChannel: {} };

    const byChannel: Record<string, number[]> = {};
    let totalMs = 0;

    for (const order of delivered) {
      if (!order.delivered_at) continue;
      const ms = order.delivered_at.getTime() - order.date_created.getTime();
      totalMs += ms;
      const channel = order.channel;
      if (!byChannel[channel]) byChannel[channel] = [];
      byChannel[channel].push(ms);
    }

    const avgHours = delivered.length > 0 ? (totalMs / delivered.length) / (1000 * 60 * 60) : 0;
    const byChannelAvg: Record<string, number> = {};
    for (const [channel, times] of Object.entries(byChannel)) {
      byChannelAvg[channel] = times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60 * 60);
    }

    return { averageHours: Math.round(avgHours * 100) / 100, byChannel: byChannelAvg };
  }

  private async getCourierPerformance(workspaceId: string) {
    const couriers = await this.prisma.courier.findMany({
      where: { workspace_id: workspaceId, is_active: true },
      include: {
        _count: { select: { orders: true } },
      },
    });

    const result = [];
    for (const courier of couriers) {
      const delivered = await this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          courier_id: courier.id,
          status: 'DELIVERED',
        },
      });
      const total = courier._count.orders;
      result.push({
        id: courier.id,
        name: courier.name,
        totalOrders: total,
        deliveredOrders: delivered,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      });
    }

    return result;
  }

  private async getPipelineVelocity(workspaceId: string) {
    const statusTransitions = [
      { from: 'NO_CONFIRMED', to: 'CONTACTED' },
      { from: 'CONTACTED', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PREPARING' },
      { from: 'PREPARING', to: 'READY' },
      { from: 'READY', to: 'SHIPPED' },
      { from: 'SHIPPED', to: 'DELIVERED' },
    ];

    const velocity: Record<string, number> = {};
    for (const transition of statusTransitions) {
      const count = await this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: transition.to,
          date_created: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });
      velocity[`${transition.from}->${transition.to}`] = count;
    }

    return velocity;
  }
}