import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditActions } from '../audit/audit.service';
import { PermissionsService } from '../auth/permissions.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

// Plan free es un concepto fijo en el sistema
const FREE_PLAN_SLUG = 'free';

@Injectable()
export class WorkspacesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly permissionsService: PermissionsService,
    ) { }

    async create(userId: string, dto: CreateWorkspaceDto) {
        // Generar slug como UUID automáticamente
        const slug = randomUUID();

        const workspace = await this.prisma.workspace.create({
            data: {
                name: dto.name,
                slug: slug,
                owner_id: userId,
                phone: dto.phone,
                website: dto.website,
                // Plan free por defecto
                plan: FREE_PLAN_SLUG,
                status: 'active',
                // Crear couriers predeterminados
                couriers: {
                    create: [
                        {
                            name: 'Shalom',
                            tracking_url: 'https://www.shalom.pe/rastreo/',
                            is_active: true,
                        },
                        {
                            name: 'Olva',
                            tracking_url: 'https://tracking.olva.pe/',
                            is_active: true,
                        }
                    ]
                }
            },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.WORKSPACE_CREATED,
            entityType: 'workspace',
            entityId: workspace.id,
            actorId: userId,
            workspaceId: workspace.id,
            metadata: { name: workspace.name, slug: workspace.slug },
        });

        return workspace;
    }

    async findAll(userId: string) {
        // Buscar workspaces donde es owner o miembro
        const ownedWorkspaces = await this.prisma.workspace.findMany({
            where: { owner_id: userId },
            include: { 
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                    }
                },
                members: {
                    select: {
                        id: true,
                        user_id: true,
                        role: true,
                        date_created: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                first_name: true,
                                last_name: true,
                                avatar: true,
                            }
                        }
                    }
                }
            },
        });

        const memberWorkspaces = await this.prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        user_id: userId
                    }
                }
            },
            include: { 
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                    }
                },
                members: {
                    select: {
                        id: true,
                        user_id: true,
                        role: true,
                        date_created: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                first_name: true,
                                last_name: true,
                                avatar: true,
                            }
                        }
                    }
                }
            },
        });

        // Eliminar duplicados
        const workspaceMap = new Map();
        [...ownedWorkspaces, ...memberWorkspaces].forEach(w => {
            workspaceMap.set(w.id, w);
        });
        return Array.from(workspaceMap.values());
    }

    async findOne(userId: string, id: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                members: {
                    select: {
                        id: true,
                        user_id: true,
                        role: true,
                        date_created: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                first_name: true,
                                last_name: true,
                                avatar: true,
                            }
                        }
                    }
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                    }
                }
            },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        // Verificar si es owner o miembro
        const isOwner = workspace.owner_id === userId;
        const isMember = workspace.members.some(m => m.user_id === userId);
        
        if (!isOwner && !isMember) throw new ForbiddenException('Access denied');

        return workspace;
    }

    async findBySlug(userId?: string, identifier?: string) {
        if (!identifier) return null;

        const workspace = await this.prisma.workspace.findFirst({
            where: {
                OR: [
                    { slug: { equals: identifier, mode: 'insensitive' } },
                    { id: identifier }
                ]
            },
            include: {
                members: {
                    select: {
                        id: true,
                        user_id: true,
                        role: true,
                        date_created: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                first_name: true,
                                last_name: true,
                                avatar: true,
                            }
                        }
                    }
                },
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                    }
                }
            },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        // Verificar si es owner o miembro
        const isOwner = workspace.owner_id === userId;
        const isMember = workspace.members.some(m => m.user_id === userId);
        
        if (!isOwner && !isMember) throw new ForbiddenException('Access denied');

        return workspace;
    }

    async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        // Solo el owner puede actualizar el workspace
        if (workspace.owner_id !== userId) throw new ForbiddenException('Access denied');

        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.website !== undefined) updateData.website = dto.website;

        const updated = await this.prisma.workspace.update({
            where: { id },
            data: updateData,
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.WORKSPACE_UPDATED,
            entityType: 'workspace',
            entityId: id,
            actorId: userId,
            workspaceId: id,
            metadata: { updatedFields: Object.keys(updateData) },
            beforeState: { name: workspace.name, slug: workspace.slug, phone: workspace.phone, website: workspace.website },
            afterState: { name: updated.name, slug: updated.slug, phone: updated.phone, website: updated.website },
        });

        return updated;
    }

    async remove(userId: string, id: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        if (workspace.owner_id !== userId) throw new ForbiddenException('Access denied');

        // Audit log antes de eliminar
        await this.auditService.log({
            action: AuditActions.WORKSPACE_DELETED,
            entityType: 'workspace',
            entityId: id,
            actorId: userId,
            metadata: { name: workspace.name, slug: workspace.slug },
        });

        return this.prisma.workspace.delete({
            where: { id },
        });
    }

    // ==================== PLAN & BILLING ====================

    async getWorkspacePlanStatus(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                plan: true,
                status: true,
                owner_id: true,
                stripe_customer_id: true,
                current_subscription: {
                    select: {
                        stripe_subscription_id: true,
                        current_period_start: true,
                        current_period_end: true,
                        cancel_at_period_end: true,
                    }
                }
            }
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
        if (!hasAccess) throw new ForbiddenException('Access denied');

        return {
            plan: workspace.plan,
            status: workspace.status,
            isActive: workspace.status === 'active',
            isPending: workspace.status === 'pending',
            currentPeriodStart: workspace.current_subscription?.current_period_start || null,
            currentPeriodEnd: workspace.current_subscription?.current_period_end || null,
            cancelAtPeriodEnd: workspace.current_subscription?.cancel_at_period_end || false,
            hasStripeCustomer: !!workspace.stripe_customer_id,
            hasSubscription: !!workspace.current_subscription?.stripe_subscription_id,
        };
    }

    async requireActivePlan(userId: string, workspaceId: string): Promise<boolean> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { status: true, owner_id: true }
        });

        if (!workspace) return false;
        
        const hasAccess = workspace.owner_id === userId || await this.hasWorkspaceAccess(userId, workspaceId);
        if (!hasAccess) return false;

        return workspace.status === 'active';
    }

    // ==================== MEMBERS ====================

    async getMembers(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        // Verificar acceso
        const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
        if (!hasAccess) throw new ForbiddenException('Access denied');

        return this.prisma.workspaceMember.findMany({
            where: { workspace_id: workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        avatar: true,
                    }
                }
            }
        });
    }

    async addMember(userId: string, workspaceId: string, memberUserId: string, role: string = 'member') {
        // Validar rol
        if (role !== 'admin' && role !== 'member') {
            throw new BadRequestException('Role must be "admin" or "member"');
        }

        // Verificar permisos
        const permissionCheck = await this.permissionsService.checkPermission(
            userId,
            workspaceId,
            'members:invite' as any,
        );

        if (!permissionCheck.allowed) {
            throw new ForbiddenException('You do not have permission to add members');
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        // Solo admin puede agregar otros admin
        if (role === 'admin' && !permissionCheck.isOwner && permissionCheck.role !== 'admin') {
            throw new ForbiddenException('Only admins can add other admins');
        }

        // Verificar que el usuario no sea ya miembro
        const existingMember = await this.prisma.workspaceMember.findUnique({
            where: {
                workspace_id_user_id: {
                    workspace_id: workspaceId,
                    user_id: memberUserId
                }
            }
        });

        if (existingMember) {
            throw new BadRequestException('User is already a member of this workspace');
        }

        // Verificar que no sea el owner
        if (workspace.owner_id === memberUserId) {
            throw new BadRequestException('Cannot add owner as member');
        }

        const member = await this.prisma.workspaceMember.create({
            data: {
                workspace_id: workspaceId,
                user_id: memberUserId,
                role: role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_INVITED,
            entityType: 'member',
            entityId: member.id,
            actorId: userId,
            workspaceId: workspaceId,
            metadata: { addedUserId: memberUserId, addedUserEmail: member.user.email, role },
        });

        return member;
    }

    async removeMember(userId: string, workspaceId: string, memberId: string) {
        // Verificar permisos
        const permissionCheck = await this.permissionsService.checkPermission(
            userId,
            workspaceId,
            'members:remove' as any,
        );

        if (!permissionCheck.allowed) {
            throw new ForbiddenException('You do not have permission to remove members');
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        const member = await this.prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspace_id: workspaceId,
            }
        });

        if (!member) throw new NotFoundException('Member not found');

        // No se puede eliminar al owner
        if (member.user_id === workspace.owner_id) {
            throw new ForbiddenException('Cannot remove the workspace owner');
        }

        // Solo admin puede eliminar a otro admin
        if (member.role === 'admin' && !permissionCheck.isOwner && permissionCheck.role !== 'admin') {
            throw new ForbiddenException('Only admins can remove other admins');
        }

        await this.prisma.workspaceMember.delete({
            where: { id: memberId },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_REMOVED,
            entityType: 'member',
            entityId: memberId,
            actorId: userId,
            workspaceId: workspaceId,
            metadata: { removedUserId: member.user_id },
        });

        return { success: true };
    }

    async changeMemberRole(userId: string, workspaceId: string, memberId: string, newRole: string) {
        // Validar rol
        if (newRole !== 'admin' && newRole !== 'member') {
            throw new BadRequestException('Role must be "admin" or "member"');
        }

        // Verificar permisos
        const canChange = await this.permissionsService.canChangeRole(
            userId,
            workspaceId,
            memberId,
            newRole as any,
        );

        if (!canChange.allowed) {
            throw new ForbiddenException(canChange.reason);
        }

        const member = await this.prisma.workspaceMember.findFirst({
            where: {
                id: memberId,
                workspace_id: workspaceId,
            }
        });

        if (!member) throw new NotFoundException('Member not found');

        const updated = await this.prisma.workspaceMember.update({
            where: { id: memberId },
            data: { role: newRole },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_ROLE_CHANGED,
            entityType: 'member',
            entityId: memberId,
            actorId: userId,
            workspaceId: workspaceId,
            metadata: { 
                userId: member.user_id, 
                oldRole: member.role, 
                newRole 
            },
        });

        return updated;
    }

    async leaveWorkspace(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        
        // No puede dejar si es owner
        if (workspace.owner_id === userId) {
            throw new BadRequestException('Owner cannot leave workspace. Transfer ownership or delete workspace.');
        }

        const member = await this.prisma.workspaceMember.findUnique({
            where: {
                workspace_id_user_id: {
                    workspace_id: workspaceId,
                    user_id: userId
                }
            }
        });

        if (!member) throw new NotFoundException('You are not a member of this workspace');

        await this.prisma.workspaceMember.delete({
            where: { id: member.id },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_LEFT,
            entityType: 'member',
            entityId: member.id,
            actorId: userId,
            workspaceId: workspaceId,
        });

        return { success: true };
    }

    // ==================== HELPERS ====================

    async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    where: { user_id: userId }
                }
            }
        });

        if (!workspace) return false;
        
        return workspace.owner_id === userId || workspace.members.length > 0;
    }

    async isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        return workspace?.owner_id === userId;
    }
}
