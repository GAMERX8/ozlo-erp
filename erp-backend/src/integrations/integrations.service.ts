import { Injectable, Logger } from '@nestjs/common';
import { WppService } from './wpp/wpp.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly wppService: WppService,
  ) {}

  /**
   * Envía notificaciones de pedidos a todos los canales de integración activos.
   */
  async notifyOrderEvent(workspaceId: string, event: 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED', order: any) {
    try {
      // Notificar por WhatsApp
      await this.wppService.handleOrderEvent(workspaceId, event, order);
      
      // Aquí se pueden agregar otros subcomponentes en el futuro (ej. SlackService, MailgunService, etc.)
    } catch (error: any) {
      this.logger.error(`Error notifying order event ${event} for workspace ${workspaceId}: ${error.message}`);
    }
  }
}
