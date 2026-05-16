import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from '../../api-keys/guards/api-key.guard';

/**
 * Guard que permite la autenticación mediante JWT (Web/Mobile) 
 * O mediante API Key (Integraciones externas).
 */
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Intentar con API Key si viene la cabecera
    if (request.headers['x-api-key']) {
      try {
        const canActivateApiKey = await this.apiKeyGuard.canActivate(context);
        if (canActivateApiKey) return true;
      } catch (e) {
        throw e;
      }
    }

    // 2. Intentar con JWT (Auth estándar)
    try {
      return await (this.jwtGuard.canActivate(context) as Promise<boolean>);
    } catch (e) {
      throw e;
    }
  }
}
