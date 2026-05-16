import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Permission,
  Role,
  userHasPermission,
  isValidRole,
  OWNER_ONLY_PERMISSIONS,
} from './permissions.config';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  isOwner: boolean;
  role: Role | null;
}

export interface WorkspaceContext {
  id: string;
  owner_id: string;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica si un usuario tiene un permiso específico en un workspace
   */
  async checkPermission(
    userId: string,
    workspaceId: string,
    permission: Permission,
  ): Promise<PermissionCheckResult> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { user_id: userId },
        },
      },
    });

    if (!workspace) {
      return {
        allowed: false,
        reason: 'Workspace not found',
        isOwner: false,
        role: null,
      };
    }

    const isOwner = workspace.owner_id === userId;

    if (isOwner) {
      return {
        allowed: true,
        isOwner: true,
        role: 'admin',
      };
    }

    const membership = workspace.members[0];
    if (!membership) {
      return {
        allowed: false,
        reason: 'User is not a member of this workspace',
        isOwner: false,
        role: null,
      };
    }

    if (OWNER_ONLY_PERMISSIONS.includes(permission)) {
      return {
        allowed: false,
        reason: `Permission '${permission}' is restricted to workspace owner only`,
        isOwner: false,
        role: membership.role as Role,
      };
    }

    const role = membership.role as Role;
    const hasPermission = userHasPermission(role, false, permission);

    return {
      allowed: hasPermission,
      reason: hasPermission ? undefined : `Role '${role}' does not have permission '${permission}'`,
      isOwner: false,
      role,
    };
  }

  /**
   * Verifica múltiples permisos (OR lógico)
   */
  async checkAnyPermission(
    userId: string,
    workspaceId: string,
    permissions: Permission[],
  ): Promise<PermissionCheckResult> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { user_id: userId },
        },
      },
    });

    if (!workspace) {
      return {
        allowed: false,
        reason: 'Workspace not found',
        isOwner: false,
        role: null,
      };
    }

    const isOwner = workspace.owner_id === userId;

    if (isOwner) {
      return {
        allowed: true,
        isOwner: true,
        role: 'admin',
      };
    }

    const membership = workspace.members[0];
    if (!membership) {
      return {
        allowed: false,
        reason: 'User is not a member of this workspace',
        isOwner: false,
        role: null,
      };
    }

    const role = membership.role as Role;
    const hasAnyPermission = permissions.some(p => {
      if (OWNER_ONLY_PERMISSIONS.includes(p)) return false;
      return userHasPermission(role, false, p);
    });

    return {
      allowed: hasAnyPermission,
      reason: hasAnyPermission ? undefined : `Role '${role}' does not have any of the required permissions`,
      isOwner: false,
      role,
    };
  }

  /**
   * Obtiene el rol de un usuario en un workspace
   */
  async getUserRole(
    userId: string,
    workspaceId: string,
  ): Promise<{ role: Role | null; isOwner: boolean }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { owner_id: true },
    });

    if (!workspace) {
      return { role: null, isOwner: false };
    }

    if (workspace.owner_id === userId) {
      return { role: 'admin', isOwner: true };
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    if (!member || !isValidRole(member.role)) {
      return { role: null, isOwner: false };
    }

    return { role: member.role as Role, isOwner: false };
  }

  /**
   * Verifica si un usuario puede cambiar el rol de otro
   */
  async canChangeRole(
    changerId: string,
    workspaceId: string,
    targetUserId: string,
    newRole: Role,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (changerId === targetUserId) {
      return { allowed: false, reason: 'Cannot change your own role' };
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { owner_id: true },
    });

    if (!workspace) {
      return { allowed: false, reason: 'Workspace not found' };
    }

    const isOwner = workspace.owner_id === changerId;

    if (workspace.owner_id === targetUserId) {
      return { allowed: false, reason: 'Cannot change the workspace owner role' };
    }

    if (isOwner) {
      return { allowed: true };
    }

    const check = await this.checkPermission(
      changerId,
      workspaceId,
      'members:role:change' as Permission,
    );

    if (!check.allowed) {
      return { allowed: false, reason: 'No permission to change roles' };
    }

    if (newRole === 'admin') {
      return { allowed: false, reason: 'Only workspace owner can assign admin role' };
    }

    return { allowed: true };
  }

  /**
   * Verifica si un usuario puede eliminar a otro miembro
   */
  async canRemoveMember(
    removerId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { owner_id: true },
    });

    if (!workspace) {
      return { allowed: false, reason: 'Workspace not found' };
    }

    if (removerId === targetUserId) {
      return { allowed: false, reason: 'Use leave workspace to remove yourself' };
    }

    if (workspace.owner_id === targetUserId) {
      return { allowed: false, reason: 'Cannot remove workspace owner' };
    }

    const isOwner = workspace.owner_id === removerId;

    if (isOwner) {
      return { allowed: true };
    }

    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: targetUserId,
        },
      },
      select: { role: true },
    });

    if (targetMember?.role === 'admin') {
      return { allowed: false, reason: 'Only owner can remove admin members' };
    }

    const check = await this.checkPermission(
      removerId,
      workspaceId,
      'members:remove' as Permission,
    );

    if (!check.allowed) {
      return { allowed: false, reason: 'No permission to remove members' };
    }

    return { allowed: true };
  }

  /**
   * Verifica si un usuario puede eliminar el workspace
   */
  async canDeleteWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { owner_id: true },
    });

    if (!workspace) {
      return { allowed: false, reason: 'Workspace not found' };
    }

    if (workspace.owner_id !== userId) {
      return { allowed: false, reason: 'Only workspace owner can delete the workspace' };
    }

    return { allowed: true };
  }
}
