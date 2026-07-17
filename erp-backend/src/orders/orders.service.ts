import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto, BulkUpdateStatusDto } from './dto/order.dto';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private integrationsService: IntegrationsService,
  ) {}

  async create(workspaceId: string, dto: CreateOrderDto, userId: string) {
    // Calcular totales
    let totalAmount = 0;
    const itemsData = dto.items.map(item => {
      const subtotal = (item.quantity * item.unit_price) - (item.discount || 0);
      totalAmount += subtotal;
      return {
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        subtotal,
        product_name: '', // Se llenará después
        product_sku: '',
      };
    });

    // Obtener información de productos
    const productIds = dto.items.map(i => i.product_id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, workspace_id: workspaceId },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Validar stock y llenar datos de productos
    for (const item of itemsData) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new NotFoundException(`Producto ${item.product_id} no encontrado`);
      }
      item.product_name = product.name;
      item.product_sku = product.sku || '';
    }

    // Obtener almacén por defecto si no se envió
    let finalWarehouseId = dto.warehouse_id;
    if (!finalWarehouseId) {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { workspace_id: workspaceId, is_active: true }
      });
      if (defaultWarehouse) {
        finalWarehouseId = defaultWarehouse.id;
      }
    }

    // Crear orden con items
    const order = await this.prisma.order.create({
      data: {
        workspace_id: workspaceId,
        client_id: dto.client_id,
        warehouse_id: finalWarehouseId,
        channel: dto.channel || 'OTHER',
        channel_detail: dto.channel_detail || null,
        order_type: dto.order_type || 'DIRECT',
        delivery_type: dto.delivery_type || 'DELIVERY',
        delivery_region: dto.delivery_region || 'LIMA',
        payment_method: dto.payment_method || 'CASH_ON_DELIVERY',
        payment_status: dto.advance_payment && dto.advance_payment > 0 ? 'PARTIAL' : 'PENDING',
        advance_payment: dto.advance_payment || 0,
        total_amount: totalAmount + (dto.shipping_cost || 0),
        shipping_cost: dto.shipping_cost || 0,
        payment_receipt_url: dto.payment_receipt_url || null,
        status: 'NO_CONFIRMED',
        courier_id: dto.courier_id || null,
        notes: dto.notes || null,
        internal_notes: dto.internal_notes || null,
        shipping_address: dto.shipping_address || null,
        shipping_reference: dto.shipping_reference || null,
        estimated_delivery_date: dto.estimated_delivery_date ? new Date(dto.estimated_delivery_date) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        client: true,
        warehouse: true,
      },
    });

    // Registrar auditoría
    await this.audit.log({
      action: 'ORDER_CREATED',
      entityType: 'order',
      entityId: order.id,
      actorId: userId,
      workspaceId: workspaceId,
      afterState: order,
    });

    // Enviar notificación de integración en segundo plano
    this.integrationsService.notifyOrderEvent(workspaceId, 'ORDER_CREATED', order).catch(() => {});

    return order;
  }

  async findAll(workspaceId: string, filters: any) {
    const { status, clientId, courierId, channel, search, page = 1, limit = 20 } = filters;
    const where: any = { workspace_id: workspaceId };

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }
    if (clientId) {
      where.client_id = clientId;
    }
    if (courierId) {
      where.courier_id = courierId;
    }
    if (channel) {
      where.channel = channel;
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { tracking_number: { contains: search, mode: 'insensitive' } },
        {
          client: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          client: true,
          courier: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
        orderBy: { date_created: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return {
      data: orders.map(order => ({
        ...order,
        order_number: (order as any).order_number || order.id.slice(0, 8),
      })),
      pagination,
      meta: pagination,
    };
  }

  async findOne(id: string, workspaceId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        client: true,
        warehouse: true,
        courier: true,
        supportTickets: true,
        stockMovements: {
          orderBy: { date_created: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Obtener historial de estados de los logs de auditoría
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        workspace_id: workspaceId,
        entity_type: 'order',
        entity_id: id,
        action: { in: ['ORDER_CREATED', 'ORDER_STATUS_UPDATED'] },
      },
      include: {
        actor: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const status_history = auditLogs.map(log => {
      const metadata = log.metadata as any;
      const beforeState = log.before_state as any;
      const afterState = log.after_state as any;

      return {
        id: log.id,
        status: afterState?.status || metadata?.new_status || (log.action === 'ORDER_CREATED' ? 'NO_CONFIRMED' : ''),
        previous_status: beforeState?.status || null,
        notes: (afterState?.notes !== beforeState?.notes) ? afterState?.notes : null,
        created_by: log.actor_id,
        created_by_user: log.actor,
        date_created: log.created_at,
      };
    }).filter(h => h.status);

    return {
      ...order,
      order_number: (order as any).order_number || order.id.slice(0, 8),
      status_history,
    };
  }

  async update(id: string, workspaceId: string, dto: UpdateOrderDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // Si se actualizan items, recalcular totales
    let totalAmount = existing.total_amount;
    const order = await this.prisma.$transaction(async (tx) => {
      // Si se actualizan items, gestionarlos
      if (dto.items) {
        // Eliminar items existentes
        await tx.orderItem.deleteMany({
          where: { order_id: id },
        });

        // Obtener info de productos para el snapshot
        const productIds = dto.items.map(i => i.product_id);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Crear nuevos items
        await tx.orderItem.createMany({
          data: dto.items.map((item) => {
            const product = productMap.get(item.product_id);
            return {
              order_id: id,
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount || 0,
              subtotal: (item.quantity * item.unit_price) - (item.discount || 0),
              notes: item.notes,
              product_name: product?.name || 'Producto eliminado',
              product_sku: product?.sku || '',
            };
          }),
        });

        // Calcular nuevo total
        totalAmount = dto.items.reduce((sum, item) => {
          return sum + ((item.quantity * item.unit_price) - (item.discount || 0));
        }, 0);
        totalAmount += dto.shipping_cost || existing.shipping_cost || 0;
      }

      return await tx.order.update({
        where: { id },
        data: {
          warehouse_id: dto.warehouse_id !== undefined ? dto.warehouse_id : undefined,
          channel: dto.channel,
          channel_detail: dto.channel_detail,
          order_type: dto.order_type,
          delivery_type: dto.delivery_type,
          delivery_region: dto.delivery_region,
          payment_method: dto.payment_method,
          payment_status: dto.payment_status,
          advance_payment: dto.advance_payment,
          shipping_cost: dto.shipping_cost,
          total_amount: totalAmount + (dto.shipping_cost !== undefined ? dto.shipping_cost : order.shipping_cost),
          payment_receipt_url: dto.payment_receipt_url,
          courier_id: dto.courier_id,
          tracking_number: dto.tracking_number,
          notes: dto.notes,
          internal_notes: dto.internal_notes,
          shipping_address: dto.shipping_address,
          shipping_reference: dto.shipping_reference,
          estimated_delivery_date: dto.estimated_delivery_date ? new Date(dto.estimated_delivery_date) : undefined,
        },
        include: {
          items: true,
          client: true,
          warehouse: true,
          courier: true,
        },
      });
    });

    await this.audit.log({
      action: 'ORDER_UPDATED',
      entityType: 'order',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
      afterState: order,
    });

    return order;
  }

  async updateStatus(id: string, workspaceId: string, dto: UpdateOrderStatusDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    const statusDates: any = {};
    switch (dto.status) {
      case 'CONTACTED':
        statusDates.contacted_at = new Date();
        break;
      case 'CONFIRMED':
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
      case 'RETURNED':
        statusDates.returned_at = new Date();
        break;
      case 'CANCELLED':
        statusDates.cancelled_at = new Date();
        break;
    }

    // Logic to generate tracking_url
    let trackingUrl = existing.tracking_url;
    const courierId = dto.courier_id || existing.courier_id;
    const trackingNumber = dto.tracking_number || existing.tracking_number;

    if (courierId && trackingNumber) {
      const courier = await this.prisma.courier.findUnique({ where: { id: courierId } });
      if (courier?.tracking_url) {
        // Simple append for now, or replace placeholder if exists
        if (courier.tracking_url.includes('{{tracking}}')) {
          trackingUrl = courier.tracking_url.replace('{{tracking}}', trackingNumber);
        } else {
          trackingUrl = `${courier.tracking_url}${trackingNumber}`;
        }
      }
    }
    
    // Obtener almacén por defecto si la orden no tiene
    let finalWarehouseId = existing.warehouse_id;
    if (!finalWarehouseId) {
      const defaultWarehouse = await this.prisma.warehouse.findFirst({
        where: { workspace_id: workspaceId, is_active: true }
      });
      if (defaultWarehouse) {
        finalWarehouseId = defaultWarehouse.id;
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        courier_id: courierId,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        warehouse_id: finalWarehouseId,
        cancellation_reason: dto.cancellation_reason,
        notes: dto.notes ? `${existing.notes || ''}\n${dto.notes}`.trim() : existing.notes,
        ...statusDates,
      },
      include: {
        items: true,
        client: true,
        warehouse: true,
        courier: true,
      },
    });

    // Si se entrega, actualizar métricas del cliente
    if (dto.status === 'DELIVERED') {
      await this.updateClientMetrics(existing.client_id, workspaceId);
    }

    // Gestionar stock según el cambio de estado
    await this.handleStockForStatusChange(existing, workspaceId, dto.status);

    await this.audit.log({
      action: 'ORDER_STATUS_UPDATED',
      entityType: 'order',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: { new_status: dto.status },
      beforeState: existing,
      afterState: order,
    });

    // Enviar notificación de integración en segundo plano
    this.integrationsService.notifyOrderEvent(workspaceId, 'ORDER_STATUS_UPDATED', order).catch(() => {});

    return order;
  }

  async bulkUpdateStatus(workspaceId: string, dto: BulkUpdateStatusDto, userId: string) {
    const statusDates: any = {};
    switch (dto.status) {
      case 'CONTACTED':
        statusDates.contacted_at = new Date();
        break;
      case 'CONFIRMED':
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
      case 'RETURNED':
        statusDates.returned_at = new Date();
        break;
      case 'CANCELLED':
        statusDates.cancelled_at = new Date();
        break;
    }

    // Handle tracking_url for bulk update if a courier_id is provided
    let trackingUrlBase = '';
    if (dto.courier_id) {
      const courier = await this.prisma.courier.findUnique({ where: { id: dto.courier_id } });
      trackingUrlBase = courier?.tracking_url || '';
    }

    const updatePromises = dto.order_ids.map(async (id) => {
      const existing = await this.findOne(id, workspaceId);

      let trackingUrl = undefined;
      if (trackingUrlBase && dto.tracking_number) {
        if (trackingUrlBase.includes('{{tracking}}')) {
          trackingUrl = trackingUrlBase.replace('{{tracking}}', dto.tracking_number);
        } else {
          trackingUrl = `${trackingUrlBase}${dto.tracking_number}`;
        }
      }
      
      // Obtener almacén por defecto si la orden no tiene
      let finalWarehouseId = existing.warehouse_id;
      if (!finalWarehouseId) {
        const defaultWarehouse = await this.prisma.warehouse.findFirst({
          where: { workspace_id: workspaceId, is_active: true }
        });
        if (defaultWarehouse) {
          finalWarehouseId = defaultWarehouse.id;
        }
      }

      const order = await this.prisma.order.update({
        where: { id, workspace_id: workspaceId },
        data: {
          status: dto.status,
          courier_id: dto.courier_id,
          tracking_number: dto.tracking_number,
          tracking_url: trackingUrl,
          warehouse_id: finalWarehouseId,
          ...statusDates,
        },
        include: {
          client: true,
        },
      });

      // Gestionar stock según el cambio de estado
      await this.handleStockForStatusChange(existing, workspaceId, dto.status);

      // Si se entrega, actualizar métricas del cliente
      if (dto.status === 'DELIVERED') {
        await this.updateClientMetrics(existing.client_id, workspaceId);
      }

      return order;
    });

    const updatedOrders = await Promise.all(updatePromises);

    // Enviar notificaciones de integración en segundo plano
    updatedOrders.forEach((order) => {
      this.integrationsService.notifyOrderEvent(workspaceId, 'ORDER_STATUS_UPDATED', order).catch(() => {});
    });

    await this.audit.log({
      action: 'ORDERS_BULK_STATUS_UPDATED',
      entityType: 'order',
      actorId: userId,
      workspaceId: workspaceId,
      metadata: { 
        order_count: dto.order_ids.length,
        new_status: dto.status,
        order_ids: dto.order_ids,
      },
    });

    return { updated: dto.order_ids.length };
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // Solo permitir eliminar órdenes en estado NO_CONFIRMED o CANCELLED
    if (!['NO_CONFIRMED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('No se puede eliminar una orden que no esté en estado No Confirmado o Cancelado');
    }

    await this.prisma.order.delete({ where: { id } });

    await this.audit.log({
      action: 'ORDER_DELETED',
      entityType: 'order',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
    });

    return { deleted: true };
  }

  async getStats(workspaceId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where = { 
      workspace_id: workspaceId,
      ...(Object.keys(dateFilter).length > 0 && { date_created: dateFilter }),
    };

    const [
      totalOrders,
      totalAmount,
      byStatus,
      byChannel,
      todayOrders,
      pendingOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { total_amount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { total_amount: true },
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        where,
        _count: { channel: true },
        _sum: { total_amount: true },
      }),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          date_created: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.order.count({
        where: {
          workspace_id: workspaceId,
          status: { in: ['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED'] },
        },
      }),
    ]);

    // Transform byStatus array to Record<OrderStatus, number>
    const statusMap = {};
    byStatus.forEach(item => {
      statusMap[item.status] = item._count.status;
    });

    // Transform byChannel array to Record<SalesChannel, number>
    const channelMap = {};
    byChannel.forEach(item => {
      channelMap[item.channel] = item._count.channel;
    });

    return {
      total_orders: totalOrders,
      total_amount: totalAmount._sum.total_amount || 0,
      today_orders: todayOrders,
      pending_orders: pendingOrders,
      delivered_orders: statusMap['DELIVERED'] || 0,
      cancelled_orders: statusMap['CANCELLED'] || 0,
      by_status: statusMap,
      by_channel: channelMap,
      daily_stats: [], // Optional for now, can be implemented if needed
    };
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

  private async handleStockForStatusChange(order: any, workspaceId: string, newStatus: string) {
    const stockDeductingStatuses = ['READY', 'SHIPPED', 'DELIVERED'];
    const isDeductStatus = stockDeductingStatuses.includes(newStatus);
    
    // Calcular el balance de movimientos para esta orden
    // Si la suma de las cantidades es menor a 0, significa que el stock está deducido
    const stockBalance = order.stockMovements?.reduce((acc: number, mov: any) => acc + mov.quantity, 0) || 0;
    const isStockDeducted = stockBalance < 0;

    if (isDeductStatus && !isStockDeducted) {
      await this.deductOrderStock(order, workspaceId);
    } else if (!isDeductStatus && isStockDeducted) {
      // If moving back to a non-out status (e.g. PREPARING, CANCELLED, RETURNED)
      await this.restoreOrderStock(order, workspaceId);
    }
  }

  private async deductOrderStock(order: any, workspaceId: string) {
    if (!order.warehouse_id) return;

    for (const item of order.items) {
      const inventoryWhere: any = {
        product_id: item.product_id,
        warehouse_id: order.warehouse_id,
        variant_id: item.variant_id || null,
      };

      let inventory = await this.prisma.inventory.findFirst({
        where: inventoryWhere,
      });

      if (!inventory) {
        inventory = await this.prisma.inventory.create({
          data: {
            product_id: item.product_id,
            warehouse_id: order.warehouse_id,
            variant_id: item.variant_id || null,
            stock: 0,
          },
        });
      }

      await this.prisma.inventory.update({
        where: { id: inventory.id },
        data: { stock: { decrement: item.quantity } },
      });

      await this.prisma.stockMovement.create({
        data: {
          product_id: item.product_id,
          warehouse_id: order.warehouse_id,
          variant_id: item.variant_id || null,
          quantity: -item.quantity,
          type: 'OUT',
          reason: `Venta - Orden ${order.id.slice(0, 8)}`,
          order_id: order.id,
          reference_id: order.id,
        },
      });
    }
  }

  private async restoreOrderStock(order: any, workspaceId: string) {
    // Buscar los movimientos OUT que no hayan sido compensados
    const movements = await this.prisma.stockMovement.findMany({
      where: { 
        order_id: order.id,
        type: 'OUT'
      }
    });

    if (movements.length === 0) return;

    // Calculate how much we need to restore for each product/variant
    // Because there could be multiple OUT/IN cycles
    const stockBalance = order.stockMovements?.reduce((acc: any, mov: any) => {
      const key = `${mov.product_id}_${mov.variant_id || 'null'}_${mov.warehouse_id}`;
      acc[key] = (acc[key] || 0) + mov.quantity;
      return acc;
    }, {}) || {};

    for (const movement of movements) {
      const key = `${movement.product_id}_${movement.variant_id || 'null'}_${movement.warehouse_id}`;
      const balance = stockBalance[key] || 0;
      
      // Si el balance es menor que 0, significa que hay stock pendiente por restaurar
      if (balance < 0) {
        const quantityToRestore = Math.abs(balance);
        
        let inventory = await this.prisma.inventory.findFirst({
          where: {
            product_id: movement.product_id,
            warehouse_id: movement.warehouse_id,
            variant_id: movement.variant_id || null
          }
        });

        if (inventory) {
          await this.prisma.inventory.update({
            where: { id: inventory.id },
            data: { stock: { increment: quantityToRestore } }
          });
        } else {
          inventory = await this.prisma.inventory.create({
            data: {
              product_id: movement.product_id,
              warehouse_id: movement.warehouse_id,
              variant_id: movement.variant_id || null,
              stock: quantityToRestore,
            }
          });
        }

        await this.prisma.stockMovement.create({
          data: {
            product_id: movement.product_id,
            warehouse_id: movement.warehouse_id,
            variant_id: movement.variant_id || null,
            quantity: quantityToRestore,
            type: 'IN',
            reason: `Devolución/Cancelación - Orden ${order.id.slice(0, 8)}`,
            order_id: order.id,
            reference_id: order.id,
          }
        });
        
        // Mark as restored in our memory so we don't restore it twice if there are multiple OUTs
        stockBalance[key] = 0;
      }
    }
  }
}
