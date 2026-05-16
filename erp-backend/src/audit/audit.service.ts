import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

// Acciones predefinidas para consistencia
export const AuditActions = {
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  USER_MFA_ENABLED: 'USER_MFA_ENABLED',
  USER_MFA_DISABLED: 'USER_MFA_DISABLED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  
  // Workspace
  WORKSPACE_CREATED: 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED: 'WORKSPACE_UPDATED',
  WORKSPACE_DELETED: 'WORKSPACE_DELETED',
  
  // Members
  MEMBER_INVITED: 'MEMBER_INVITED',
  MEMBER_INVITATION_ACCEPTED: 'MEMBER_INVITATION_ACCEPTED',
  MEMBER_INVITATION_REJECTED: 'MEMBER_INVITATION_REJECTED',
  MEMBER_INVITATION_CANCELED: 'MEMBER_INVITATION_CANCELED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_LEFT: 'MEMBER_LEFT',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
  
  // Billing
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  PAYMENT_SUCCEEDED: 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  
  // Admin
  ADMIN_USER_UPDATED: 'ADMIN_USER_UPDATED',
  ADMIN_USER_DELETED: 'ADMIN_USER_DELETED',
  ADMIN_WORKSPACE_UPDATED: 'ADMIN_WORKSPACE_UPDATED',
} as const;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entity_type: data.entityType,
          entity_id: data.entityId,
          actor_id: data.actorId,
          actor_type: data.actorType || 'user',
          workspace_id: data.workspaceId,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
          before_state: data.beforeState ? JSON.parse(JSON.stringify(data.beforeState)) : null,
          after_state: data.afterState ? JSON.parse(JSON.stringify(data.afterState)) : null,
          success: data.success ?? true,
          error_message: data.errorMessage,
        },
      });
    } catch (error) {
      // No lanzamos error para no interrumpir el flujo principal
      // pero sí lo logueamos en consola
      console.error('[AuditLog] Error creating log:', error);
    }
  }

  async getLogs(filters: {
    workspaceId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const where: any = {};

    if (filters.workspaceId) where.workspace_id = filters.workspaceId;
    if (filters.actorId) where.actor_id = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entity_type = filters.entityType;
    if (filters.entityId) where.entity_id = filters.entityId;
    
    if (filters.startDate || filters.endDate) {
      where.created_at = {};
      if (filters.startDate) where.created_at.gte = filters.startDate;
      if (filters.endDate) where.created_at.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getWorkspaceActivity(workspaceId: string, limit: number = 20): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: { workspace_id: workspaceId },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async getUserActivity(userId: string, limit: number = 50): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: { actor_id: userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
