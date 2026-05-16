import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { Permission } from '../permissions.config';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorador para requerir permisos en un endpoint
 */
export const RequirePermissions = (...permissions: Permission[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    return target;
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissions || permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const workspaceId = this.extractWorkspaceId(request);

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID not found in request');
    }

    let result;
    if (permissions.length === 1) {
      result = await this.permissionsService.checkPermission(
        user.userId,
        workspaceId,
        permissions[0],
      );
    } else {
      result = await this.permissionsService.checkAnyPermission(
        user.userId,
        workspaceId,
        permissions,
      );
    }

    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Permission denied');
    }

    request.permissionCheck = result;

    return true;
  }

  private extractWorkspaceId(request: any): string | null {
    const params = request.params;
    if (params.workspaceId || params.workspace_id) {
      return params.workspaceId || params.workspace_id;
    }

    const body = request.body;
    if (body.workspaceId || body.workspace_id) {
      return body.workspaceId || body.workspace_id;
    }

    const query = request.query;
    if (query.workspaceId || query.workspace_id) {
      return query.workspaceId || query.workspace_id;
    }

    return null;
  }
}
