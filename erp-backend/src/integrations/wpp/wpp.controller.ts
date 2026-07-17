import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { WppService, SaveWppConfigDto } from './wpp.service';
import { CombinedAuthGuard } from '../../auth/guards/combined-auth.guard';
import { PermissionsService } from '../../auth/permissions.service';

@ApiTags('Integraciones')
@ApiSecurity('x-api-key')
@Controller('integrations/wpp')
@UseGuards(CombinedAuthGuard)
export class WppController {
  constructor(
    private readonly wppService: WppService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async checkAdminPermission(userId: string, workspaceId: string) {
    const permission = await this.permissionsService.checkPermission(
      userId,
      workspaceId,
      'workspace:settings:write',
    );
    if (!permission.allowed) {
      throw new ForbiddenException(
        permission.reason || 'No tienes permisos para gestionar integraciones en este workspace',
      );
    }
  }

  private async checkReadPermission(userId: string, workspaceId: string) {
    const permission = await this.permissionsService.checkPermission(
      userId,
      workspaceId,
      'workspace:settings:read',
    );
    if (!permission.allowed) {
      throw new ForbiddenException(
        permission.reason || 'No tienes permisos para ver integraciones en este workspace',
      );
    }
  }

  @ApiOperation({ summary: 'Obtener configuración de integración de WhatsApp' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @Get()
  async getConfig(@Query('workspaceId') workspaceId: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    await this.checkReadPermission(userId, workspaceId);
    return this.wppService.getConfig(workspaceId);
  }

  @ApiOperation({ summary: 'Guardar configuración de integración de WhatsApp' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @Post()
  async saveConfig(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: SaveWppConfigDto,
    @Request() req,
  ) {
    const userId = req.user.id || req.user.userId;
    await this.checkAdminPermission(userId, workspaceId);
    return this.wppService.saveConfig(
      workspaceId,
      dto.instanceName,
      dto.apiKey,
      dto.instanceUrl || '',
      dto.adminPhone || '',
      dto.clientNotificationsEnabled,
      dto.templates || {},
      dto.is_active,
    );
  }

  @ApiOperation({ summary: 'Enviar una notificación de prueba' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestNotification(@Query('workspaceId') workspaceId: string, @Request() req) {
    const userId = req.user.id || req.user.userId;
    await this.checkAdminPermission(userId, workspaceId);
    return this.wppService.sendTestNotification(workspaceId);
  }
}
