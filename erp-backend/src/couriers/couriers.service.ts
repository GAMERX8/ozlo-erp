import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCourierDto, UpdateCourierDto } from './dto/courier.dto';

@Injectable()
export class CouriersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, dto: CreateCourierDto, userId: string) {
    try {
      console.log('--- DB Create Courier Attempt ---');
      console.log('WorkspaceID:', workspaceId);
      
      const courier = await this.prisma.courier.create({
        data: {
          workspace_id: workspaceId,
          name: dto.name,
          phone: dto.phone || null,
          email: dto.email || null,
          website: dto.website || null,
          tracking_url: dto.tracking_url || null,
          document_type: dto.document_type || null,
          document_number: dto.document_number || null,
          vehicle_type: dto.vehicle_type || null,
          license_plate: dto.license_plate || null,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
        },
      });

      console.log('Courier Successfully Created in DB:', courier.id);

      await this.audit.log({
        action: 'COURIER_CREATED',
        entityType: 'courier',
        entityId: courier.id,
        actorId: userId,
        workspaceId: workspaceId,
        afterState: courier,
      });

      return courier;
    } catch (error) {
      console.error('CRITICAL ERROR during Courier creation:');
      console.error(error);
      throw error;
    }
  }

  async findAll(workspaceId: string, isActive?: boolean) {
    const where: any = { workspace_id: workspaceId };
    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    return this.prisma.courier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const courier = await this.prisma.courier.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        orders: {
          take: 10,
          orderBy: { date_created: 'desc' },
          select: {
            id: true,
            status: true,
            tracking_number: true,
            total_amount: true,
            date_created: true,
            client: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!courier) {
      throw new NotFoundException('Courier no encontrado');
    }

    return courier;
  }

  async update(id: string, workspaceId: string, dto: UpdateCourierDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    const courier = await this.prisma.courier.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        tracking_url: dto.tracking_url,
        document_type: dto.document_type,
        document_number: dto.document_number,
        vehicle_type: dto.vehicle_type,
        license_plate: dto.license_plate,
        workspace_id: dto.workspace_id,
        is_active: dto.is_active,
      },
    });

    await this.audit.log({
      action: 'COURIER_UPDATED',
      entityType: 'courier',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
      afterState: courier,
    });

    return courier;
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // Verificar si tiene órdenes asociadas
    if (existing._count.orders > 0) {
      // Desactivar en lugar de eliminar
      const courier = await this.prisma.courier.update({
        where: { id },
        data: { is_active: false },
      });

      await this.audit.log({
        action: 'COURIER_DEACTIVATED',
        entityType: 'courier',
        entityId: id,
        actorId: userId,
        workspaceId: workspaceId,
        beforeState: existing,
        afterState: courier,
      });

      return { deactivated: true, courier };
    }

    await this.prisma.courier.delete({ where: { id } });

    await this.audit.log({
      action: 'COURIER_DELETED',
      entityType: 'courier',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
    });

    return { deleted: true };
  }

  async getCourierStats(id: string, workspaceId: string) {
    const courier = await this.prisma.courier.findFirst({
      where: { id, workspace_id: workspaceId },
    });

    if (!courier) {
      throw new NotFoundException('Courier no encontrado');
    }

    const [totalOrders, deliveredOrders, inTransitOrders] = await Promise.all([
      this.prisma.order.count({
        where: { workspace_id: workspaceId, courier_id: id },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, courier_id: id, status: 'DELIVERED' },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, courier_id: id, status: 'SHIPPED' },
      }),
    ]);

    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    return {
      total_orders: totalOrders,
      delivered_orders: deliveredOrders,
      in_transit_orders: inTransitOrders,
      delivery_rate: Math.round(deliveryRate * 100) / 100,
    };
  }

  async getAllCouriersStats(workspaceId: string) {
    const couriers = await this.prisma.courier.findMany({
      where: { workspace_id: workspaceId },
      select: { id: true, name: true, is_active: true },
    });

    const stats = [];
    for (const courier of couriers) {
      const [total_orders, delivered_orders] = await Promise.all([
        this.prisma.order.count({
          where: { workspace_id: workspaceId, courier_id: courier.id },
        }),
        this.prisma.order.count({
          where: { workspace_id: workspaceId, courier_id: courier.id, status: 'DELIVERED' },
        }),
      ]);

      stats.push({
        id: courier.id,
        courier_id: courier.id,
        name: courier.name,
        is_active: courier.is_active,
        total_orders,
        delivered_orders,
        pending_orders: total_orders - delivered_orders,
        delivery_rate: total_orders > 0 ? Math.round((delivered_orders / total_orders) * 10000) / 100 : 0,
      });
    }

    return stats;
  }

  async getCourierOrders(id: string, workspaceId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { workspace_id: workspaceId, courier_id: id },
        skip,
        take: limit,
        orderBy: { date_created: 'desc' },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          items: { select: { id: true, product_name: true, quantity: true, unit_price: true } },
        },
      }),
      this.prisma.order.count({
        where: { workspace_id: workspaceId, courier_id: id },
      }),
    ]);

    return {
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
