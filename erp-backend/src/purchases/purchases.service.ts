import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreatePurchaseDto {
  supplier_id: string;
  warehouse_id: string;
  expected_date?: Date;
  invoice_number?: string;
  notes?: string;
  items: {
    product_id: string;
    variant_id?: string;
    quantity_ordered: number;
    unit_cost: number;
  }[];
}

export interface UpdatePurchaseDto {
  supplier_id?: string;
  warehouse_id?: string;
  expected_date?: Date;
  invoice_number?: string;
  notes?: string;
  status?: string;
}

export interface ReceivePurchaseDto {
  items: {
    purchase_item_id: string;
    quantity_received: number;
  }[];
  invoice_url?: string;
}

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, dto: CreatePurchaseDto, userId: string) {
    // Validar que el proveedor existe
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplier_id, workspace_id: workspaceId },
    });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    // Validar que el almacén existe
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouse_id, workspace_id: workspaceId },
    });
    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado');
    }

    // Validar productos
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.product_id, workspace_id: workspaceId },
      });
      if (!product) {
        throw new NotFoundException(`Producto con ID ${item.product_id} no encontrado`);
      }

      if (item.variant_id) {
        const variant = await this.prisma.productVariant.findFirst({
          where: { id: item.variant_id, product_id: item.product_id },
        });
        if (!variant) {
          throw new NotFoundException(`Variante con ID ${item.variant_id} no encontrada`);
        }
      }
    }

    // Calcular totales
    const subtotal = dto.items.reduce((sum, item) => 
      sum + (item.quantity_ordered * item.unit_cost), 0
    );
    const taxAmount = subtotal * 0.18; // IGV 18%
    const totalAmount = subtotal + taxAmount;

    // Generar número de orden correlativo de forma segura
    const lastPurchase = await this.prisma.purchase.findFirst({
      where: { workspace_id: workspaceId, order_number: { startsWith: 'OC-' } },
      orderBy: { order_number: 'desc' },
      select: { order_number: true }
    });

    let nextNumber = 1;
    if (lastPurchase && lastPurchase.order_number) {
      const match = lastPurchase.order_number.match(/OC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    } else {
      // Fallback si no hay compras
      const count = await this.prisma.purchase.count({
        where: { workspace_id: workspaceId }
      });
      if (count > 0) nextNumber = count + 1;
    }

    const order_number = `OC-${nextNumber.toString().padStart(4, '0')}`;

    const purchase = await this.prisma.$transaction(async (tx) => {
      // Crear la orden de compra como BORRADOR (DRAFT)
      const newPurchase = await tx.purchase.create({
        data: {
          workspace_id: workspaceId,
          order_number,
          supplier_id: dto.supplier_id,
          warehouse_id: dto.warehouse_id,
          status: 'DRAFT',
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          expected_date: dto.expected_date || new Date(),
          invoice_number: dto.invoice_number,
          notes: dto.notes,
        },
      });

      // Crear los items de compra únicamente (sin recibirlos todavía)
      for (const item of dto.items) {
        const subtotalItem = item.quantity_ordered * item.unit_cost;
        
        await tx.purchaseItem.create({
          data: {
            purchase_id: newPurchase.id,
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            quantity_ordered: item.quantity_ordered,
            quantity_received: 0, // Inicia en 0
            unit_cost: item.unit_cost,
            subtotal: subtotalItem,
          }
        });
      }

      return newPurchase;
    });

    const purchaseWithItems = await this.prisma.purchase.findUnique({
      where: { id: purchase.id },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await this.audit.log({
      action: 'PURCHASE_CREATED',
      entityType: 'purchase',
      entityId: purchase.id,
      actorId: userId,
      workspaceId: workspaceId,
      afterState: purchaseWithItems as any,
    });

    return {
      ...purchaseWithItems,
      created_at: purchaseWithItems.date_created,
      updated_at: purchaseWithItems.date_updated,
    };
  }

  async findAll(workspaceId: string, options: { 
    status?: string, 
    supplier_id?: string, 
    search?: string, 
    page?: number, 
    limit?: number 
  } = {}) {
    const { status, supplier_id, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { workspace_id: workspaceId };
    
    if (status && status !== 'all') {
      where.status = status;
    }

    if (supplier_id && supplier_id !== 'all') {
      where.supplier_id = supplier_id;
    }

    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: 'insensitive' } },
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.purchase.count({ where }),
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, document_number: true },
          },
          warehouse: {
            select: { id: true, name: true },
          },
          items: {
            select: {
              id: true,
              quantity_ordered: true,
              quantity_received: true,
              unit_cost: true,
              subtotal: true,
            },
          },
        },
        orderBy: { date_created: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: data.map(item => ({
        ...item,
        created_at: item.date_created,
        updated_at: item.date_updated,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, workspaceId: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
            variant: {
              select: { id: true, sku_variant: true, attributes: true },
            },
          },
        },
        stockMovements: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
          orderBy: { date_created: 'desc' },
        },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return {
      ...purchase,
      created_at: purchase.date_created,
      updated_at: purchase.date_updated,
    };
  }

  async update(id: string, workspaceId: string, dto: UpdatePurchaseDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // No permitir modificar si ya fue recibida o cancelada
    if (existing.status === 'RECEIVED') {
      throw new BadRequestException('No se puede modificar una compra ya recibida');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('No se puede modificar una compra cancelada');
    }

    // Validar proveedor si se cambia
    if (dto.supplier_id && dto.supplier_id !== existing.supplier_id) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplier_id, workspace_id: workspaceId },
      });
      if (!supplier) {
        throw new NotFoundException('Proveedor no encontrado');
      }
    }

    // Validar almacén si se cambia
    if (dto.warehouse_id && dto.warehouse_id !== existing.warehouse_id) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouse_id, workspace_id: workspaceId },
      });
      if (!warehouse) {
        throw new NotFoundException('Almacén no encontrado');
      }
    }

    const purchase = await this.prisma.purchase.update({
      where: { id },
      data: {
        supplier_id: dto.supplier_id,
        warehouse_id: dto.warehouse_id,
        expected_date: dto.expected_date,
        invoice_number: dto.invoice_number,
        notes: dto.notes,
        status: dto.status,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await this.audit.log({
      action: 'PURCHASE_UPDATED',
      entityType: 'purchase',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: purchase as any,
    });

    return {
      ...purchase,
      created_at: purchase.date_created,
      updated_at: purchase.date_updated,
    };
  }

  async receive(id: string, workspaceId: string, dto: ReceivePurchaseDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    if (existing.status === 'RECEIVED') {
      throw new BadRequestException('Esta compra ya fue completamente recibida');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('No se puede recibir una compra cancelada');
    }

    // Validar que los items existen en esta compra
    const purchaseItemIds = existing.items.map(i => i.id);
    for (const item of dto.items) {
      if (!purchaseItemIds.includes(item.purchase_item_id)) {
        throw new BadRequestException(`Item ${item.purchase_item_id} no pertenece a esta compra`);
      }
      if (item.quantity_received < 0) {
        throw new BadRequestException('La cantidad recibida no puede ser negativa');
      }
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      // Actualizar cada item de compra
      for (const item of dto.items) {
        const purchaseItem = existing.items.find(i => i.id === item.purchase_item_id);
        const newQuantityReceived = purchaseItem!.quantity_received + item.quantity_received;
        
        if (newQuantityReceived > purchaseItem!.quantity_ordered) {
          throw new BadRequestException(
            `La cantidad total recibida (${newQuantityReceived}) excede la cantidad ordenada (${purchaseItem!.quantity_ordered})`
          );
        }

        await tx.purchaseItem.update({
          where: { id: item.purchase_item_id },
          data: { quantity_received: newQuantityReceived },
        });

        // Actualizar inventario
        const inventoryWhere: any = {
          product_id: purchaseItem!.product_id,
          warehouse_id: existing.warehouse_id,
        };
        if (purchaseItem!.variant_id) {
          inventoryWhere.variant_id = purchaseItem!.variant_id;
        }

        const existingInventory = await tx.inventory.findFirst({
          where: inventoryWhere,
        });

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: { stock: { increment: item.quantity_received } },
          });
        } else {
          await tx.inventory.create({
            data: {
              product_id: purchaseItem!.product_id,
              variant_id: purchaseItem!.variant_id,
              warehouse_id: existing.warehouse_id,
              stock: item.quantity_received,
            },
          });
        }

        // Registrar movimiento de stock
        await tx.stockMovement.create({
          data: {
            product_id: purchaseItem!.product_id,
            variant_id: purchaseItem!.variant_id,
            warehouse_id: existing.warehouse_id,
            quantity: item.quantity_received,
            type: 'IN',
            reason: 'Compra recibida',
            purchase_id: id,
            reference_id: existing.invoice_number || id,
          },
        });
      }

      // Verificar si todos los items fueron completamente recibidos
      const updatedItems = await tx.purchaseItem.findMany({
        where: { purchase_id: id },
      });

      const allReceived = updatedItems.every(
        item => item.quantity_received >= item.quantity_ordered
      );

      const anyReceived = updatedItems.some(item => item.quantity_received > 0);

      const updatedPurchase = await tx.purchase.update({
        where: { id },
        data: {
          status: allReceived ? 'RECEIVED' : (anyReceived ? 'PARTIAL' : 'ORDERED'),
          received_date: allReceived ? new Date() : null,
          invoice_url: dto.invoice_url || existing.invoice_url,
        },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      return updatedPurchase;
    });

    await this.audit.log({
      action: 'PURCHASE_RECEIVED',
      entityType: 'purchase',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: purchase as any,
      metadata: { itemsReceived: dto.items },
    });

    return {
      ...purchase,
      created_at: purchase.date_created,
      updated_at: purchase.date_updated,
    };
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // No permitir eliminar si ya fue recibida
    if (existing.status === 'RECEIVED') {
      // Cambiar a cancelada en lugar de eliminar
      const purchase = await this.prisma.purchase.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await this.audit.log({
        action: 'PURCHASE_CANCELLED',
        entityType: 'purchase',
        entityId: id,
        actorId: userId,
        workspaceId: workspaceId,
        beforeState: existing as any,
        afterState: purchase as any,
      });

      return { cancelled: true, purchase };
    }

    await this.prisma.purchase.delete({ where: { id } });

    await this.audit.log({
      action: 'PURCHASE_DELETED',
      entityType: 'purchase',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
    });

    return { deleted: true };
  }

  async getStats(workspaceId: string) {
    const [totalPurchases, byStatus, totalAmount] = await Promise.all([
      this.prisma.purchase.count({
        where: { workspace_id: workspaceId },
      }),
      this.prisma.purchase.groupBy({
        by: ['status'],
        where: { workspace_id: workspaceId },
        _count: { status: true },
        _sum: { total_amount: true },
      }),
      this.prisma.purchase.aggregate({
        where: { workspace_id: workspaceId },
        _sum: { total_amount: true },
      }),
    ]);

    return {
      totalPurchases,
      totalAmount: totalAmount._sum.total_amount || 0,
      byStatus,
    };
  }
}
