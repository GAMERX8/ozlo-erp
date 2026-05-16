import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      return false;
    }

    const verification = await this.apiKeysService.validateKey(apiKey);

    if (!verification) {
      throw new UnauthorizedException('API Key inválida o expirada');
    }

    // Inyectar el usuario en el request para que los controladores (req.user) funcionen igual
    request.user = {
      ...verification.user,
      userId: verification.user.id,
    };

    // Asegurar que el workspaceId en el query coincida con el de la API Key
    // Los controladores del ERP usan @Query('workspaceId') extensivamente
    if (!request.query.workspaceId) {
      request.query.workspaceId = verification.workspace.id;
    } else if (request.query.workspaceId !== verification.workspace.id) {
       throw new UnauthorizedException('La API Key no pertenece a este Workspace');
    }

    return true;
  }
}
