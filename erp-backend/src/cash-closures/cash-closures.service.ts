import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreateCashClosureDto {
  initial_amount: number;
}

export interface UpdateCashClosureDto {
  initial_amount?: number;
}

export interface CloseCashClosureDto {
  adjustment_amount?: number;
  adjustment_note?: string;
}

@Injectable()
export class CashClosuresService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, dto: CreateCashClosureDto, userId: string) {
    // Verificar si ya existe una caja abierta
    const existingOpen = await this.prisma.cashClosure.findFirst({
      where: {
        workspace_id: workspaceId,
        status: 'OPEN',
      },
    });

    if (existingOpen) {
      throw new BadRequestException('Ya existe una caja abierta. Ciérrela antes de abrir una nueva.');
    }

    const cashClosure = await this.prisma.cashClosure.create({
      data: {
        workspace_id: workspaceId,
        initial_amount: dto.initial_amount || 0,
        opened_by: userId,
        status: 'OPEN',
        total_sales: 0,
        total_cash: 0,
        total_transfer: 0,
        total_yape_plin: 0,
        adjustment_amount: 0,
      },
    });

    await this.audit.log({
      action: 'CASH_CLOSURE_OPENED',
      entityType: 'cash_closure',
      entityId: cashClosure.id,
      actorId: userId,
      workspaceId: workspaceId,
      afterState: cashClosure as any,
    });

    return cashClosure;
  }

  async findAll(workspaceId: string, status?: string) {
    const where: any = { workspace_id: workspaceId };
    if (status) {
      where.status = status;
    }

    return this.prisma.cashClosure.findMany({
      where,
      orderBy: { opened_at: 'desc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const cashClosure = await this.prisma.cashClosure.findFirst({
      where: { id, workspace_id: workspaceId },
    });

    if (!cashClosure) {
      throw new NotFoundException('Cierre de caja no encontrado');
    }

    return cashClosure;
  }

  async getCurrent(workspaceId: string) {
    const cashClosure = await this.prisma.cashClosure.findFirst({
      where: {
        workspace_id: workspaceId,
        status: 'OPEN',
      },
    });

    if (!cashClosure) {
      return null;
    }

    // Calcular totales actuales basados en las órdenes del período
    const orders = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        date_created: {
          gte: cashClosure.opened_at,
        },
        payment_status: 'PAID',
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      select: {
        payment_method: true,
        total_amount: true,
      },
    });

    const totals = orders.reduce((acc, order) => {
      acc.total_sales += order.total_amount;
      
      switch (order.payment_method) {
        case 'CASH':
        case 'CASH_ON_DELIVERY':
          acc.total_cash += order.total_amount;
          break;
        case 'TRANSFER':
          acc.total_transfer += order.total_amount;
          break;
        case 'YAPE':
        case 'PLIN':
          acc.total_yape_plin += order.total_amount;
          break;
      }
      
      return acc;
    }, {
      total_sales: 0,
      total_cash: 0,
      total_transfer: 0,
      total_yape_plin: 0,
    });

    // Monto esperado en caja (efectivo inicial + ventas en efectivo)
    const expectedCash = cashClosure.initial_amount + totals.total_cash;

    return {
      ...cashClosure,
      current_totals: totals,
      expected_cash: expectedCash,
      order_count: orders.length,
    };
  }

  async update(id: string, workspaceId: string, dto: UpdateCashClosureDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    if (existing.status !== 'OPEN') {
      throw new BadRequestException('Solo se pueden modificar cajas abiertas');
    }

    const cashClosure = await this.prisma.cashClosure.update({
      where: { id },
      data: {
        initial_amount: dto.initial_amount,
      },
    });

    await this.audit.log({
      action: 'CASH_CLOSURE_UPDATED',
      entityType: 'cash_closure',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: cashClosure as any,
    });

    return cashClosure;
  }

  async close(id: string, workspaceId: string, dto: CloseCashClosureDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    if (existing.status !== 'OPEN') {
      throw new BadRequestException('Esta caja ya está cerrada');
    }

    // Calcular totales finales de las órdenes
    const orders = await this.prisma.order.findMany({
      where: {
        workspace_id: workspaceId,
        date_created: {
          gte: existing.opened_at,
        },
        payment_status: 'PAID',
        status: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      select: {
        payment_method: true,
        total_amount: true,
      },
    });

    const totals = orders.reduce((acc, order) => {
      acc.total_sales += order.total_amount;
      
      switch (order.payment_method) {
        case 'CASH':
        case 'CASH_ON_DELIVERY':
          acc.total_cash += order.total_amount;
          break;
        case 'TRANSFER':
          acc.total_transfer += order.total_amount;
          break;
        case 'YAPE':
        case 'PLIN':
          acc.total_yape_plin += order.total_amount;
          break;
      }
      
      return acc;
    }, {
      total_sales: 0,
      total_cash: 0,
      total_transfer: 0,
      total_yape_plin: 0,
    });

    const cashClosure = await this.prisma.cashClosure.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        closed_by: userId,
        total_sales: totals.total_sales,
        total_cash: totals.total_cash,
        total_transfer: totals.total_transfer,
        total_yape_plin: totals.total_yape_plin,
        adjustment_amount: dto.adjustment_amount || 0,
        adjustment_note: dto.adjustment_note,
      },
    });

    await this.audit.log({
      action: 'CASH_CLOSURE_CLOSED',
      entityType: 'cash_closure',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: cashClosure as any,
      metadata: {
        closedBy: userId,
        adjustmentAmount: dto.adjustment_amount,
        totals,
      },
    });

    return {
      ...cashClosure,
      final_totals: totals,
      order_count: orders.length,
    };
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // No permitir eliminar cajas cerradas
    if (existing.status === 'CLOSED') {
      throw new BadRequestException('No se pueden eliminar cajas ya cerradas');
    }

    await this.prisma.cashClosure.delete({ where: { id } });

    await this.audit.log({
      action: 'CASH_CLOSURE_DELETED',
      entityType: 'cash_closure',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
    });

    return { deleted: true };
  }

  // Método adicional para obtener resumen del día
  async getDailySummary(workspaceId: string, date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const cashClosures = await this.prisma.cashClosure.findMany({
      where: {
        workspace_id: workspaceId,
        status: 'CLOSED',
        closed_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const summary = cashClosures.reduce((acc, closure) => {
      acc.total_initial += closure.initial_amount;
      acc.total_sales += closure.total_sales;
      acc.total_cash += closure.total_cash;
      acc.total_transfer += closure.total_transfer;
      acc.total_yape_plin += closure.total_yape_plin;
      acc.total_adjustments += closure.adjustment_amount;
      acc.closure_count += 1;
      return acc;
    }, {
      total_initial: 0,
      total_sales: 0,
      total_cash: 0,
      total_transfer: 0,
      total_yape_plin: 0,
      total_adjustments: 0,
      closure_count: 0,
    });

    return {
      date: startOfDay,
      ...summary,
      cash_closures: cashClosures,
    };
  }
}
