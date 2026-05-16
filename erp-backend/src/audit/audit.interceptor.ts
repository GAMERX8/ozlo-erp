import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService, AuditLogData } from './audit.service';
import { Request } from 'express';

interface AuditOptions {
  action: string;
  entityType: string;
  getEntityId?: (request: any, response: any) => string | undefined;
  getWorkspaceId?: (request: any, response: any) => string | undefined;
  getMetadata?: (request: any, response: any) => Record<string, any> | undefined;
  captureResponse?: boolean;
}

// Decorador para marcar endpoints que quieren auditoría
export const AUDIT_KEY = 'audit';
export function Audit(options: AuditOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(AUDIT_KEY, options, descriptor.value);
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const auditOptions: AuditOptions = Reflect.getMetadata(AUDIT_KEY, handler);

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    
    const startTime = Date.now();
    const beforeState = { ...request.body };

    return next.handle().pipe(
      tap({
        next: (response) => {
          this.logAudit(request, auditOptions, user, true, undefined, beforeState, response, startTime);
        },
        error: (error) => {
          this.logAudit(request, auditOptions, user, false, error.message, beforeState, undefined, startTime);
        },
      })
    );
  }

  private async logAudit(
    request: Request,
    options: AuditOptions,
    user: any,
    success: boolean,
    errorMessage: string | undefined,
    beforeState: any,
    response: any,
    startTime: number,
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    const logData: AuditLogData = {
      action: options.action,
      entityType: options.entityType,
      actorId: user?.userId,
      actorType: 'user',
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      success,
      errorMessage,
      beforeState,
      afterState: options.captureResponse && response ? { response, duration_ms: duration } : undefined,
    };

    if (options.getEntityId) {
      logData.entityId = options.getEntityId(request, response);
    }

    if (options.getWorkspaceId) {
      logData.workspaceId = options.getWorkspaceId(request, response);
    }

    if (options.getMetadata) {
      logData.metadata = options.getMetadata(request, response);
    }

    await this.auditService.log(logData);
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
