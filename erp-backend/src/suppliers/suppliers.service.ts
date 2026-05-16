import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, dto: CreateSupplierDto, userId: string) {
    const supplier = await this.prisma.supplier.create({
      data: {
        workspace_id: workspaceId,
        name: dto.name,
        document_type: dto.document_type || 'RUC',
        document_number: dto.document_number,
        contact_name: dto.contact_name || null,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        website: dto.website || null,
        payment_terms: dto.payment_terms || null,
        lead_time_days: dto.lead_time_days || null,
        notes: dto.notes || null,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      },
    });

    await this.audit.log({
      action: 'SUPPLIER_CREATED',
      entityType: 'supplier',
      entityId: supplier.id,
      actorId: userId,
      workspaceId: workspaceId,
      afterState: supplier,
    });

    return { ...supplier, created_at: supplier.date_created, updated_at: supplier.date_updated };
  }

  async findAll(workspaceId: string, isActive?: boolean, search?: string) {
    const where: any = { workspace_id: workspaceId };
    
    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact_name: { contains: search, mode: 'insensitive' } },
        { document_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    const data = await this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    });

    return data.map(item => ({
      ...item,
      created_at: item.date_created,
      updated_at: item.date_updated,
    }));
  }

  async findOne(id: string, workspaceId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        purchases: {
          take: 10,
          orderBy: { date_created: 'desc' },
          select: {
            id: true,
            status: true,
            total_amount: true,
            order_date: true,
            warehouse: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return { ...supplier, created_at: supplier.date_created, updated_at: supplier.date_updated };
  }

  async update(id: string, workspaceId: string, dto: UpdateSupplierDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        name: dto.name,
        document_type: dto.document_type,
        document_number: dto.document_number,
        contact_name: dto.contact_name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        website: dto.website,
        payment_terms: dto.payment_terms,
        lead_time_days: dto.lead_time_days,
        notes: dto.notes,
        is_active: dto.is_active,
      },
    });

    await this.audit.log({
      action: 'SUPPLIER_UPDATED',
      entityType: 'supplier',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
      afterState: supplier,
    });

    return {
      ...supplier,
      created_at: supplier.date_created,
      updated_at: supplier.date_updated,
    };
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    if (existing._count.purchases > 0) {
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: { is_active: false },
      });

      await this.audit.log({
        action: 'SUPPLIER_DEACTIVATED',
        entityType: 'supplier',
        entityId: id,
        actorId: userId,
        workspaceId: workspaceId,
        beforeState: existing,
        afterState: supplier,
      });

      return { deactivated: true, supplier };
    }

    await this.prisma.supplier.delete({ where: { id } });

    await this.audit.log({
      action: 'SUPPLIER_DELETED',
      entityType: 'supplier',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing,
    });

    return { deleted: true };
  }

  async getProducts(id: string, workspaceId: string) {
    const supplier = await this.findOne(id, workspaceId);

    const purchaseItems = await this.prisma.purchaseItem.findMany({
      where: {
        purchase: {
          supplier_id: id,
          workspace_id: workspaceId,
          status: { in: ['ORDERED', 'RECEIVED'] },
        },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, status: true },
        },
      },
      distinct: ['product_id'],
    });

    return purchaseItems.map(item => ({
      ...item.product,
      last_unit_cost: item.unit_cost,
      last_order_quantity: item.quantity_ordered,
    }));
  }

  async getPurchaseOrders(id: string, workspaceId: string) {
    return this.prisma.purchase.findMany({
      where: { supplier_id: id, workspace_id: workspaceId },
      include: {
        warehouse: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            product: { select: { id: true, name: true, sku: true } },
            quantity_ordered: true,
            quantity_received: true,
            unit_cost: true,
            subtotal: true,
          },
        },
      },
      orderBy: { date_created: 'desc' },
    });
  }
}
