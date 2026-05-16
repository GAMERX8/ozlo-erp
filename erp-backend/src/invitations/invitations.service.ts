import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService, AuditActions } from '../audit/audit.service';
import { PermissionsService } from '../auth/permissions.service';
import { PERMISSIONS, Role, isValidRole } from '../auth/permissions.config';

@Injectable()
export class InvitationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly auditService: AuditService,
        private readonly permissionsService: PermissionsService,
    ) { }

    async createInvitation(
        inviterId: string, 
        workspaceId: string, 
        email: string, 
        role: string = 'member'
    ) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                owner: {
                    select: {
                        first_name: true,
                        last_name: true,
                    }
                }
            }
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        // Verificar permiso de invitar
        const permissionCheck = await this.permissionsService.checkPermission(
            inviterId,
            workspaceId,
            PERMISSIONS.MEMBERS_INVITE,
        );

        if (!permissionCheck.allowed) {
            throw new ForbiddenException('You do not have permission to invite members');
        }

        // Validar rol
        if (!isValidRole(role)) {
            throw new BadRequestException('Invalid role. Must be "admin" or "member"');
        }

        // Solo admin puede invitar como admin
        if (role === 'admin' && !permissionCheck.isOwner && permissionCheck.role !== 'admin') {
            throw new ForbiddenException('Only admins can invite other admins');
        }

        // Buscar usuario por email
        const invitedUser = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!invitedUser) {
            throw new BadRequestException('User not found. They must register first.');
        }

        // Verificar que no sea el owner
        if (workspace.owner_id === invitedUser.id) {
            throw new BadRequestException('Cannot invite the owner');
        }

        // Verificar que no sea ya miembro
        const existingMember = await this.prisma.workspaceMember.findUnique({
            where: {
                workspace_id_user_id: {
                    workspace_id: workspaceId,
                    user_id: invitedUser.id
                }
            }
        });

        if (existingMember) {
            throw new BadRequestException('User is already a member of this workspace');
        }

        // Verificar que no haya una invitación pendiente
        const existingInvitation = await this.prisma.workspaceInvitation.findFirst({
            where: {
                workspace_id: workspaceId,
                invited_user_id: invitedUser.id,
                status: 'pending',
            }
        });

        if (existingInvitation) {
            throw new BadRequestException('An invitation is already pending for this user');
        }

        // Crear la invitación
        const invitation = await this.prisma.workspaceInvitation.create({
            data: {
                workspace_id: workspaceId,
                invited_user_id: invitedUser.id,
                invited_by: inviterId,
                role: role as Role,
                status: 'pending',
            },
            include: {
                invited_user: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                inviter: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                }
            }
        });

        // Enviar email de invitación
        await this.mailService.sendInvitationEmail(
            invitation.invited_user.email,
            invitation.workspace.name,
            `${invitation.inviter.first_name || ''} ${invitation.inviter.last_name || ''}`.trim() || invitation.inviter.email
        );

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_INVITED,
            entityType: 'invitation',
            entityId: invitation.id,
            actorId: inviterId,
            workspaceId: workspaceId,
            metadata: { invitedUserId: invitedUser.id, invitedUserEmail: email },
        });

        // Transformar la respuesta para que coincida con lo que espera el frontend
        return {
            id: invitation.id,
            status: invitation.status,
            workspace_id: invitation.workspace,
            invited_user_id: invitation.invited_user,
            invited_by: invitation.inviter,
            date_created: invitation.date_created,
        };
    }

    async getPendingInvitations(userId: string) {
        const invitations = await this.prisma.workspaceInvitation.findMany({
            where: {
                invited_user_id: userId,
                status: 'pending',
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                },
                inviter: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            },
            orderBy: {
                date_created: 'desc'
            }
        });

        // Transformar la respuesta para que coincida con lo que espera el frontend
        return invitations.map(invitation => ({
            id: invitation.id,
            status: invitation.status,
            workspace_id: invitation.workspace,
            invited_user_id: invitation.invited_user_id,
            invited_by: invitation.inviter,
            date_created: invitation.date_created,
        }));
    }

    async getWorkspaceInvitations(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');

        const canView = await this.canManageInvitations(userId, workspaceId);
        if (!canView) throw new ForbiddenException('Access denied');

        const invitations = await this.prisma.workspaceInvitation.findMany({
            where: {
                workspace_id: workspaceId,
                status: 'pending',
            },
            include: {
                invited_user: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                },
                inviter: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    }
                }
            },
            orderBy: {
                date_created: 'desc'
            }
        });

        // Transformar la respuesta para que coincida con lo que espera el frontend
        return invitations.map(invitation => ({
            id: invitation.id,
            status: invitation.status,
            workspace_id: workspaceId,
            invited_user_id: invitation.invited_user,
            invited_by: invitation.inviter,
            date_created: invitation.date_created,
        }));
    }

    async acceptInvitation(userId: string, invitationId: string) {
        const invitation = await this.prisma.workspaceInvitation.findFirst({
            where: {
                id: invitationId,
                invited_user_id: userId,
                status: 'pending',
            },
        });

        if (!invitation) throw new NotFoundException('Invitation not found or already processed');

        // Crear el miembro con el rol especificado en la invitación
        await this.prisma.workspaceMember.create({
            data: {
                workspace_id: invitation.workspace_id,
                user_id: userId,
                role: invitation.role,
            }
        });

        // Actualizar la invitación
        await this.prisma.workspaceInvitation.update({
            where: { id: invitationId },
            data: { status: 'accepted' },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_INVITATION_ACCEPTED,
            entityType: 'invitation',
            entityId: invitationId,
            actorId: userId,
            workspaceId: invitation.workspace_id,
        });

        return { success: true };
    }

    async rejectInvitation(userId: string, invitationId: string) {
        const invitation = await this.prisma.workspaceInvitation.findFirst({
            where: {
                id: invitationId,
                invited_user_id: userId,
                status: 'pending',
            },
        });

        if (!invitation) throw new NotFoundException('Invitation not found or already processed');

        await this.prisma.workspaceInvitation.update({
            where: { id: invitationId },
            data: { status: 'rejected' },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_INVITATION_REJECTED,
            entityType: 'invitation',
            entityId: invitationId,
            actorId: userId,
            workspaceId: invitation.workspace_id,
        });

        return { success: true };
    }

    async cancelInvitation(userId: string, invitationId: string) {
        const invitation = await this.prisma.workspaceInvitation.findUnique({
            where: { id: invitationId },
            include: {
                workspace: true
            }
        });

        if (!invitation) throw new NotFoundException('Invitation not found');

        const canCancel = await this.canManageInvitations(userId, invitation.workspace_id);
        if (!canCancel) throw new ForbiddenException('Access denied');

        await this.prisma.workspaceInvitation.delete({
            where: { id: invitationId },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.MEMBER_INVITATION_CANCELED,
            entityType: 'invitation',
            entityId: invitationId,
            actorId: userId,
            workspaceId: invitation.workspace_id,
            metadata: { invitedUserId: invitation.invited_user_id },
        });

        return { success: true };
    }

    // ==================== HELPERS ====================

    private async canManageInvitations(userId: string, workspaceId: string): Promise<boolean> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) return false;
        
        // Solo owner puede gestionar invitaciones
        return workspace.owner_id === userId;
    }
}
