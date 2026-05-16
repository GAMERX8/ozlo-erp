import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface CreateSupportTicketDto {
  order_id?: string;
  type: 'RETURN' | 'EXCHANGE' | 'WARRANTY' | 'COMPLAINT' | 'QUESTION' | 'OTHER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
}

export interface UpdateSupportTicketDto {
  type?: 'RETURN' | 'EXCHANGE' | 'WARRANTY' | 'COMPLAINT' | 'QUESTION' | 'OTHER';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  subject?: string;
  description?: string;
  resolution?: string;
}

export interface AssignTicketDto {
  assigned_to: string;
}

@Injectable()
export class SupportTicketsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, dto: CreateSupportTicketDto, userId: string) {
    // Validar orden si se proporciona
    if (dto.order_id) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.order_id, workspace_id: workspaceId },
      });
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        workspace_id: workspaceId,
        order_id: dto.order_id || null,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        status: 'OPEN',
        subject: dto.subject,
        description: dto.description,
        created_by: userId,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            client: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        },
      },
    });

    await this.audit.log({
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'support_ticket',
      entityId: ticket.id,
      actorId: userId,
      workspaceId: workspaceId,
      afterState: ticket as any,
    });

    return ticket;
  }

  async findAll(workspaceId: string, filters?: { status?: string; priority?: string; type?: string; assigned_to?: string }) {
    const where: any = { workspace_id: workspaceId };
    
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.assigned_to) {
      where.assigned_to = filters.assigned_to;
    }

    return this.prisma.supportTicket.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { date_created: 'desc' },
      ],
    });
  }

  async findOne(id: string, workspaceId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        order: {
          include: {
            client: true,
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket de soporte no encontrado');
    }

    return ticket;
  }

  async update(id: string, workspaceId: string, dto: UpdateSupportTicketDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // Si se está resolviendo el ticket, establecer fecha de resolución
    const updateData: any = {
      type: dto.type,
      priority: dto.priority,
      status: dto.status,
      subject: dto.subject,
      description: dto.description,
      resolution: dto.resolution,
    };

    if (dto.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
      updateData.resolved_at = new Date();
      updateData.resolved_by = userId;
    }

    // Si se reabre el ticket, limpiar datos de resolución
    if (dto.status === 'OPEN' && existing.status === 'RESOLVED') {
      updateData.resolved_at = null;
      updateData.resolved_by = null;
    }

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await this.audit.log({
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'support_ticket',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: ticket as any,
    });

    return ticket;
  }

  async assign(id: string, workspaceId: string, dto: AssignTicketDto, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // Validar que el usuario asignado existe en el workspace
    const assignedUser = await this.prisma.workspaceMember.findFirst({
      where: {
        workspace_id: workspaceId,
        user_id: dto.assigned_to,
      },
      include: {
        user: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!assignedUser) {
      throw new NotFoundException('Usuario no encontrado en el workspace');
    }

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assigned_to: dto.assigned_to,
        status: existing.status === 'OPEN' ? 'IN_PROGRESS' : existing.status,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await this.audit.log({
      action: 'SUPPORT_TICKET_ASSIGNED',
      entityType: 'support_ticket',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
      afterState: ticket as any,
      metadata: { assignedTo: dto.assigned_to },
    });

    return {
      ...ticket,
      assigned_user: assignedUser.user,
    };
  }

  async remove(id: string, workspaceId: string, userId: string) {
    const existing = await this.findOne(id, workspaceId);

    // No permitir eliminar tickets ya resueltos (solo cerrarlos)
    if (existing.status === 'RESOLVED' || existing.status === 'CLOSED') {
      throw new BadRequestException('No se puede eliminar un ticket resuelto o cerrado');
    }

    await this.prisma.supportTicket.delete({ where: { id } });

    await this.audit.log({
      action: 'SUPPORT_TICKET_DELETED',
      entityType: 'support_ticket',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
      beforeState: existing as any,
    });

    return { deleted: true };
  }

  // Método adicional para obtener estadísticas
  async getStats(workspaceId: string) {
    const [total, byStatus, byType, byPriority] = await Promise.all([
      this.prisma.supportTicket.count({
        where: { workspace_id: workspaceId },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where: { workspace_id: workspaceId },
        _count: { status: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['type'],
        where: { workspace_id: workspaceId },
        _count: { type: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ['priority'],
        where: { workspace_id: workspaceId },
        _count: { priority: true },
      }),
    ]);

    return { total, byStatus, byType, byPriority };
  }

  async getComments(ticketId: string, workspaceId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, workspace_id: workspaceId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    return this.prisma.supportTicketComment.findMany({
      where: { ticket_id: ticketId },
      orderBy: { date_created: 'asc' },
    });
  }

  async addComment(ticketId: string, workspaceId: string, userId: string, content: string, isInternal: boolean = false) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, workspace_id: workspaceId },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');

    const comment = await this.prisma.supportTicketComment.create({
      data: {
        ticket_id: ticketId,
        content,
        created_by: userId,
        is_internal: isInternal,
      },
    });

    await this.audit.log({
      action: 'SUPPORT_TICKET_COMMENT_ADDED',
      entityType: 'support_ticket',
      entityId: ticketId,
      actorId: userId,
      workspaceId,
      afterState: comment,
    });

    return comment;
  }
}
