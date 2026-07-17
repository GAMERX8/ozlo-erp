import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class SaveWppConfigDto {
  @IsString()
  instanceName: string;

  @IsString()
  apiKey: string;

  @IsString()
  @IsOptional()
  instanceUrl?: string;

  @IsString()
  @IsOptional()
  adminPhone?: string;

  @IsBoolean()
  clientNotificationsEnabled: boolean;

  @IsOptional()
  templates?: Record<string, string>;

  @IsBoolean()
  is_active: boolean;
}

const STATUS_MAP: Record<string, string> = {
  'NO_CONFIRMED': 'No Confirmado',
  'CONTACTED': 'Contactado',
  'CONFIRMED': 'Confirmado',
  'PREPARING': 'En Preparación',
  'READY': 'Listo para Despacho / Entrega',
  'SHIPPED': 'Enviado',
  'DELIVERED': 'Entregado',
  'RETURNED': 'Devuelto / Retornado',
  'CANCELLED': 'Cancelado',
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  'ORDER_CREATED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `Tu pedido *#{orderNumber}* ha sido registrado correctamente.\n` +
    `*Total:* S/. {totalAmount}\n` +
    `*Método de pago:* {paymentMethod}\n\n` +
    `¡Gracias por tu compra! Te notificaremos cuando cambie el estado de envío.`,
  
  'CONFIRMED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Confirmado*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'PREPARING': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *En Preparación*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'READY': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Listo para Despacho / Entrega*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'SHIPPED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Enviado*.\n` +
    `*Courier / Transportista:* {courierName}\n` +
    `*Código de seguimiento:* {trackingNumber}\n` +
    `*Sigue tu envío aquí:* {trackingUrl}\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'DELIVERED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Entregado*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'CANCELLED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Cancelado*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
};

@Injectable()
export class WppService {
  private readonly logger = new Logger(WppService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(workspaceId: string) {
    const integration = await this.prisma.workspaceIntegration.findUnique({
      where: {
        workspace_id_type: {
          workspace_id: workspaceId,
          type: 'wpp',
        },
      },
    });

    if (!integration) {
      return {
        instanceName: '',
        apiKey: '',
        instanceUrl: 'https://api2.wazend.net',
        adminPhone: '',
        clientNotificationsEnabled: false,
        templates: {},
        is_active: false,
      };
    }

    const config = integration.config as any;
    return {
      instanceName: config?.instanceName || '',
      apiKey: config?.apiKey || '',
      instanceUrl: config?.instanceUrl || 'https://api2.wazend.net',
      adminPhone: config?.adminPhone || '',
      clientNotificationsEnabled: !!config?.clientNotificationsEnabled,
      templates: config?.templates || {},
      is_active: integration.is_active,
    };
  }

  async saveConfig(
    workspaceId: string,
    instanceName: string,
    apiKey: string,
    instanceUrl: string,
    adminPhone: string,
    clientNotificationsEnabled: boolean,
    templates: Record<string, string>,
    isActive: boolean,
  ) {
    if (isActive) {
      if (!instanceName) {
        throw new BadRequestException('El nombre de la instancia es requerido para activar la integración');
      }
      if (!apiKey) {
        throw new BadRequestException('El token API Key es requerido para activar la integración');
      }
    }

    if (instanceUrl) {
      try {
        new URL(instanceUrl);
      } catch (e) {
        throw new BadRequestException('La URL de instancia proporcionada no es válida');
      }
    }

    const integration = await this.prisma.workspaceIntegration.upsert({
      where: {
        workspace_id_type: {
          workspace_id: workspaceId,
          type: 'wpp',
        },
      },
      create: {
        workspace_id: workspaceId,
        type: 'wpp',
        config: {
          instanceName,
          apiKey,
          instanceUrl: instanceUrl || 'https://api2.wazend.net',
          adminPhone,
          clientNotificationsEnabled,
          templates: templates || {},
        },
        is_active: isActive,
      },
      update: {
        config: {
          instanceName,
          apiKey,
          instanceUrl: instanceUrl || 'https://api2.wazend.net',
          adminPhone,
          clientNotificationsEnabled,
          templates: templates || {},
        },
        is_active: isActive,
      },
    });

    const config = integration.config as any;
    return {
      instanceName: config?.instanceName || '',
      apiKey: config?.apiKey || '',
      instanceUrl: config?.instanceUrl || 'https://api2.wazend.net',
      adminPhone: config?.adminPhone || '',
      clientNotificationsEnabled: !!config?.clientNotificationsEnabled,
      templates: config?.templates || {},
      is_active: integration.is_active,
    };
  }

  async sendTestNotification(workspaceId: string) {
    const configData = await this.getConfig(workspaceId);

    if (!configData.instanceName || !configData.apiKey) {
      throw new BadRequestException('Debe configurar la instancia y API Key de Wazend primero');
    }

    if (!configData.adminPhone) {
      throw new BadRequestException('Configure un número de teléfono de administrador para recibir la prueba');
    }

    const message = '🔔 *Prueba del ERP*\n\n¡Hola! Esta es una prueba de conexión exitosa desde tu ERP usando Wazend.';

    try {
      await this.sendWazendMessage(
        configData.instanceUrl,
        configData.instanceName,
        configData.apiKey,
        configData.adminPhone,
        message,
      );
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error sending test notification to ${configData.adminPhone}: ${error.message}`);
      throw new BadRequestException(`No se pudo enviar el mensaje por Wazend: ${error.message}`);
    }
  }

  async handleOrderEvent(workspaceId: string, event: string, order: any) {
    const orderNumber = order.order_number || order.id.slice(0, 8);
    this.logger.log(`Procesando evento de orden: ${event} para el pedido #${orderNumber} (Estado: ${order.status})`);

    try {
      const integration = await this.prisma.workspaceIntegration.findUnique({
        where: {
          workspace_id_type: {
            workspace_id: workspaceId,
            type: 'wpp',
          },
        },
      });

      if (!integration) {
        this.logger.warn(`Integración WhatsApp no configurada para el workspace: ${workspaceId}`);
        return;
      }

      if (!integration.is_active) {
        this.logger.warn(`Integración WhatsApp desactivada (is_active: false) para el workspace: ${workspaceId}`);
        return;
      }

      const config = integration.config as any;
      const instanceUrl = config?.instanceUrl || 'https://api2.wazend.net';
      const instanceName = config?.instanceName;
      const apiKey = config?.apiKey;

      if (!instanceName || !apiKey) {
        this.logger.warn(`Credenciales de Wazend incompletas (instancia o apiKey faltantes)`);
        return;
      }

      // 1. Notificación al Administrador (Nuevo Pedido)
      if (event === 'ORDER_CREATED' && config.adminPhone) {
        const adminMessage = 
          `🔔 *Nuevo Pedido Recibido*\n\n` +
          `*Pedido:* #${orderNumber}\n` +
          `*Cliente:* ${order.client?.name || 'Cliente general'}\n` +
          `*Total:* S/. ${order.total_amount.toFixed(2)}\n` +
          `*Método de pago:* ${order.payment_method}\n\n` +
          `Gestiona este pedido en el panel de control.`;

        this.logger.log(`Enviando notificación de administrador al número: ${config.adminPhone}`);
        this.sendWazendMessage(instanceUrl, instanceName, apiKey, config.adminPhone, adminMessage)
          .then(() => this.logger.log('Notificación de administrador enviada con éxito'))
          .catch((err) => this.logger.error(`Admin notification failed: ${err.message}`));
      }

      // 2. Notificación al Cliente
      if (config.clientNotificationsEnabled) {
        if (!order.client?.phone) {
          this.logger.warn(`No se puede notificar al cliente: el pedido no tiene un cliente asociado o el cliente no tiene teléfono`);
          return;
        }

        const templates = config.templates || {};
        let clientMessage = '';

        if (event === 'ORDER_CREATED') {
          const template = templates.ORDER_CREATED || DEFAULT_TEMPLATES.ORDER_CREATED;
          clientMessage = this.parseTemplate(template, order);
        } else if (event === 'ORDER_STATUS_UPDATED') {
          const statusTemplate = templates[order.status] || DEFAULT_TEMPLATES[order.status];
          if (statusTemplate) {
            clientMessage = this.parseTemplate(statusTemplate, order);
          } else {
            // Genérico si no existe plantilla específica para ese estado
            const genericTemplate = `¡Hola *{clientName}*! 👋\n\nEl estado de tu pedido *#{orderNumber}* ha cambiado a: *{status}*.\n\n¡Gracias por confiar en nosotros!`;
            clientMessage = this.parseTemplate(genericTemplate, order);
          }
        }

        if (clientMessage) {
          this.logger.log(`Enviando mensaje al cliente (${order.client.phone}) para el evento ${event}`);
          this.sendWazendMessage(instanceUrl, instanceName, apiKey, order.client.phone, clientMessage)
            .then(() => this.logger.log(`Mensaje de cliente enviado con éxito al número: ${order.client.phone}`))
            .catch((err) => this.logger.error(`Client notification to ${order.client.phone} failed: ${err.message}`));
        } else {
          this.logger.log(`No se generó ningún mensaje para el evento ${event} (estado: ${order.status})`);
        }
      } else {
        this.logger.warn(`Notificaciones a clientes desactivadas (clientNotificationsEnabled: false)`);
      }

    } catch (error: any) {
      this.logger.error(`Error in handleOrderEvent: ${error.message}`);
    }
  }

  private parseTemplate(template: string, order: any): string {
    if (!template) return '';
    
    const variables: Record<string, string> = {
      clientName: order.client?.name || '',
      orderNumber: order.order_number || order.id.slice(0, 8),
      totalAmount: order.total_amount ? order.total_amount.toFixed(2) : '0.00',
      paymentMethod: order.payment_method || '',
      paymentStatus: order.payment_status || '',
      shippingCost: order.shipping_cost ? order.shipping_cost.toFixed(2) : '0.00',
      notes: order.notes || '',
      shippingAddress: order.shipping_address || '',
      courierName: order.courier?.name || '',
      trackingNumber: order.tracking_number || '',
      trackingUrl: order.tracking_url || '',
      status: STATUS_MAP[order.status] || order.status,
    };

    let text = template;
    for (const [key, value] of Object.entries(variables)) {
      text = text.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return text;
  }

  private async sendWazendMessage(instanceUrl: string, instanceName: string, apiKey: string, number: string, text: string) {
    const cleanNumber = number.replace(/\D/g, '');
    if (!cleanNumber) {
      throw new Error('El número de teléfono es inválido');
    }

    let formattedNumber = cleanNumber;
    // Si tiene 9 dígitos, anteponer el código de país de Perú (51)
    if (formattedNumber.length === 9) {
      formattedNumber = `51${formattedNumber}`;
    }

    const baseUrl = (instanceUrl || 'https://api2.wazend.net').replace(/\/+$/, '');
    const url = `${baseUrl}/message/sendText/${instanceName}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey,
        },
        body: JSON.stringify({
          number: formattedNumber,
          text: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Wazend API respondió con código ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
