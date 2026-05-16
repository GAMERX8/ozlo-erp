import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OperationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getKanbanBoard(workspaceId: string) {
    const columns = [
      { status: 'NO_CONFIRMED', title: 'Sin Confirmar', orders: [] },
      { status: 'CONTACTED', title: 'Contactado', orders: [] },
      { status: 'PREPARING', title: 'Preparando', orders: [] },
      { status: 'READY', title: 'Listo', orders: [] },
      { status: 'SHIPPED', title: 'Enviado', orders: [] },
      { status: 'DELIVERED', title: 'Entregado', orders: [] },
    ];

    const orders = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        status: { notIn: ['RETURNED', 'CANCELLED'] },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { select: { id: true, product_name: true, quantity: true, unit_price: true } },
        courier: { select: { id: true, name: true } },
      },
      orderBy: { date_created: 'desc' },
    });

    const columnMap = new Map(columns.map((c) => [c.status, c]));
    for (const order of orders) {
      const column = columnMap.get(order.status);
      if (column) {
        column.orders.push(order);
      }
    }

    return columns;
  }

  async getOperationsStats(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      totalPending,
      totalProcessing,
      totalShipped,
      deliveredToday,
      delayedOrders,
      byStatus,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { workspace_id: workspaceId },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, status: { in: ['NO_CONFIRMED', 'CONTACTED'] } },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, status: 'PREPARING' },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, status: 'SHIPPED' },
      }),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: 'DELIVERED',
          delivered_at: { gte: today },
        },
      }),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: { in: ['NO_CONFIRMED', 'CONTACTED', 'PREPARING', 'READY'] },
          date_created: { lt: yesterday },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { workspace_id: workspaceId },
        _count: { status: true },
      }),
    ]);

    const statusMap = {};
    byStatus.forEach(item => {
      statusMap[item.status] = item._count.status;
    });

    return {
      total_orders: totalOrders,
      pending_confirmation: totalPending,
      pending_preparation: totalProcessing,
      in_transit: totalShipped,
      delivered_today: deliveredToday,
      delayed_orders: delayedOrders,
      by_status: statusMap,
    };
  }

  private async getAverageProcessingTime(workspaceId: string): Promise<number> {
    const delivered = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'DELIVERED',
        date_created: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        delivered_at: { not: null },
      },
      select: { date_created: true, delivered_at: true },
    });

    if (delivered.length === 0) return 0;

    const totalMs = delivered.reduce((sum, o) => {
      if (!o.delivered_at) return sum;
      return sum + (o.delivered_at.getTime() - o.date_created.getTime());
    }, 0);

    return Math.round((totalMs / delivered.length / (1000 * 60 * 60)) * 100) / 100;
  }

  async moveOrderStatus(workspaceId: string, orderId: string, newStatus: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, workspace_id: workspaceId },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    const statusDates: any = {};
    switch (newStatus) {
      case 'CONTACTED':
        statusDates.contacted_at = new Date();
        break;
      case 'PREPARING':
        statusDates.preparing_at = new Date();
        break;
      case 'READY':
        statusDates.ready_at = new Date();
        break;
      case 'SHIPPED':
        statusDates.shipped_at = new Date();
        break;
      case 'DELIVERED':
        statusDates.delivered_at = new Date();
        statusDates.payment_status = 'PAID';
        break;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus, ...statusDates },
      include: {
        client: true,
        items: true,
        courier: true,
      },
    });

    if (newStatus === 'DELIVERED') {
      await this.updateClientMetrics(order.client_id, workspaceId);
    }

    await this.audit.log({
      action: 'ORDER_STATUS_UPDATED',
      entityType: 'order',
      entityId: orderId,
      actorId: userId,
      workspaceId,
      metadata: { new_status: newStatus, source: 'operations_kanban' },
      beforeState: order,
      afterState: updated,
    });

    return updated;
  }

  async quickAction(workspaceId: string, orderId: string, action: string, userId: string, data?: any) {
    const actionToStatus: Record<string, string> = {
      confirm: 'CONTACTED',
      start_preparation: 'PREPARING',
      mark_ready: 'READY',
      mark_shipped: 'SHIPPED',
      mark_delivered: 'DELIVERED',
    };

    const newStatus = actionToStatus[action];
    if (!newStatus) throw new Error(`Unknown action: ${action}`);

    const updateData: any = { status: newStatus };

    const statusDates: any = {};
    switch (newStatus) {
      case 'CONTACTED':
        statusDates.contacted_at = new Date();
        break;
      case 'PREPARING':
        statusDates.preparing_at = new Date();
        break;
      case 'READY':
        statusDates.ready_at = new Date();
        break;
      case 'SHIPPED':
        statusDates.shipped_at = new Date();
        if (data?.courier_id) updateData.courier_id = data.courier_id;
        if (data?.tracking_number) updateData.tracking_number = data.tracking_number;
        break;
      case 'DELIVERED':
        statusDates.delivered_at = new Date();
        updateData.payment_status = 'PAID';
        break;
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { ...updateData, ...statusDates },
      include: {
        client: { select: { id: true, name: true } },
        items: true,
        courier: { select: { id: true, name: true } },
      },
    });

    if (newStatus === 'DELIVERED') {
      await this.updateClientMetrics(updated.client_id, workspaceId);
    }

    await this.audit.log({
      action: 'ORDER_QUICK_ACTION',
      entityType: 'order',
      entityId: orderId,
      actorId: userId,
      workspaceId,
      metadata: { action, new_status: newStatus },
    });

    return updated;
  }

  async getUrgentOrders(workspaceId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        status: { in: ['NO_CONFIRMED', 'CONTACTED'] },
        date_created: { lt: yesterday },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: { select: { id: true, product_name: true, quantity: true } },
      },
      orderBy: { date_created: 'asc' },
    });
  }

  private async updateClientMetrics(clientId: string, workspaceId: string) {
    const stats = await this.prisma.order.aggregate({
      where: {
        client_id: clientId,
        workspace_id: workspaceId,
        status: 'DELIVERED',
      },
      _count: { id: true },
      _sum: { total_amount: true },
      _max: { delivered_at: true },
    });

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        total_purchases: stats._count.id,
        total_spent: stats._sum.total_amount || 0,
        last_purchase_date: stats._max.delivered_at,
      },
    });
  }
}