import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsString()
  product_id: string;

  @ApiPropertyOptional({ description: 'ID de la variante (opcional)' })
  @IsString()
  @IsOptional()
  variant_id?: string;

  @ApiProperty({ description: 'Cantidad', example: 1 })
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario', example: 25.00 })
  @IsNumber()
  @Type(() => Number)
  unit_price: number;

  @ApiPropertyOptional({ description: 'Descuento unitario', example: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  discount?: number;

  @ApiPropertyOptional({ description: 'Notas del item' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsString()
  client_id: string;

  @ApiPropertyOptional({ description: 'ID del almacén' })
  @IsString()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Canal de venta', enum: ['FACEBOOK', 'WHATSAPP', 'INSTAGRAM', 'TIKTOK', 'OTHER'] })
  @IsEnum(['FACEBOOK', 'WHATSAPP', 'INSTAGRAM', 'TIKTOK', 'OTHER'])
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Detalle del canal (ej. nombre de usuario)' })
  @IsString()
  @IsOptional()
  channel_detail?: string;

  @ApiPropertyOptional({ description: 'Tipo de pedido', enum: ['DIRECT', 'PREORDER'], default: 'DIRECT' })
  @IsEnum(['DIRECT', 'PREORDER'])
  @IsOptional()
  order_type?: string;

  @ApiPropertyOptional({ description: 'Tipo de entrega', enum: ['DELIVERY', 'PICKUP'], default: 'DELIVERY' })
  @IsEnum(['DELIVERY', 'PICKUP'])
  @IsOptional()
  delivery_type?: string;

  @ApiPropertyOptional({ description: 'Región de entrega', enum: ['LIMA', 'PROVINCE'], default: 'LIMA' })
  @IsEnum(['LIMA', 'PROVINCE'])
  @IsOptional()
  delivery_region?: string;

  @ApiPropertyOptional({ description: 'Método de pago', enum: ['CASH_ON_DELIVERY', 'CASH', 'TRANSFER', 'YAPE', 'PLIN'] })
  @IsEnum(['CASH_ON_DELIVERY', 'CASH', 'TRANSFER', 'YAPE', 'PLIN'])
  @IsOptional()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Adelanto de pago', example: 0 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  advance_payment?: number;

  @ApiPropertyOptional({ description: 'Costo de envío', example: 10.00 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  shipping_cost?: number;

  @ApiPropertyOptional({ description: 'URL del comprobante de pago' })
  @IsString()
  @IsOptional()
  payment_receipt_url?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsString()
  @IsOptional()
  internal_notes?: string;

  @ApiPropertyOptional({ description: 'Dirección de envío' })
  @IsString()
  @IsOptional()
  shipping_address?: string;

  @ApiPropertyOptional({ description: 'Referencia de envío' })
  @IsString()
  @IsOptional()
  shipping_reference?: string;

  @ApiPropertyOptional({ description: 'Fecha estimada de entrega' })
  @IsDateString()
  @IsOptional()
  estimated_delivery_date?: string;

  @ApiPropertyOptional({ description: 'ID del courier asignado' })
  @IsString()
  @IsOptional()
  courier_id?: string;

  @ApiProperty({ description: 'Lista de productos en el pedido', type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'ID del almacén' })
  @IsString()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Canal de venta', enum: ['FACEBOOK', 'WHATSAPP', 'INSTAGRAM', 'TIKTOK', 'OTHER'] })
  @IsEnum(['FACEBOOK', 'WHATSAPP', 'INSTAGRAM', 'TIKTOK', 'OTHER'])
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'Detalle del canal' })
  @IsString()
  @IsOptional()
  channel_detail?: string;

  @ApiPropertyOptional({ description: 'Tipo de pedido', enum: ['DIRECT', 'PREORDER'] })
  @IsEnum(['DIRECT', 'PREORDER'])
  @IsOptional()
  order_type?: string;

  @ApiPropertyOptional({ description: 'Tipo de entrega', enum: ['DELIVERY', 'PICKUP'] })
  @IsEnum(['DELIVERY', 'PICKUP'])
  @IsOptional()
  delivery_type?: string;

  @ApiPropertyOptional({ description: 'Región de entrega', enum: ['LIMA', 'PROVINCE'] })
  @IsEnum(['LIMA', 'PROVINCE'])
  @IsOptional()
  delivery_region?: string;

  @ApiPropertyOptional({ description: 'Método de pago', enum: ['CASH_ON_DELIVERY', 'CASH', 'TRANSFER', 'YAPE', 'PLIN'] })
  @IsEnum(['CASH_ON_DELIVERY', 'CASH', 'TRANSFER', 'YAPE', 'PLIN'])
  @IsOptional()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Estado del pago', enum: ['PENDING', 'PARTIAL', 'PAID'] })
  @IsEnum(['PENDING', 'PARTIAL', 'PAID'])
  @IsOptional()
  payment_status?: string;

  @ApiPropertyOptional({ description: 'Adelanto de pago' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  advance_payment?: number;

  @ApiPropertyOptional({ description: 'Costo de envío' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  shipping_cost?: number;

  @ApiPropertyOptional({ description: 'URL del comprobante' })
  @IsString()
  @IsOptional()
  payment_receipt_url?: string;

  @ApiPropertyOptional({ description: 'ID del courier' })
  @IsString()
  @IsOptional()
  courier_id?: string;

  @ApiPropertyOptional({ description: 'Número de tracking' })
  @IsString()
  @IsOptional()
  tracking_number?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsString()
  @IsOptional()
  internal_notes?: string;

  @ApiPropertyOptional({ description: 'Dirección de envío' })
  @IsString()
  @IsOptional()
  shipping_address?: string;

  @ApiPropertyOptional({ description: 'Referencia de envío' })
  @IsString()
  @IsOptional()
  shipping_reference?: string;

  @ApiPropertyOptional({ description: 'Fecha estimada de entrega' })
  @IsDateString()
  @IsOptional()
  estimated_delivery_date?: string;

  @ApiPropertyOptional({ description: 'Lista de productos', type: [OrderItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'Nuevo estado del pedido', enum: ['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'] })
  @IsEnum(['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'])
  status: string;

  @ApiPropertyOptional({ description: 'Número de tracking' })
  @IsString()
  @IsOptional()
  tracking_number?: string;

  @ApiPropertyOptional({ description: 'ID del courier' })
  @IsString()
  @IsOptional()
  courier_id?: string;

  @ApiPropertyOptional({ description: 'Motivo de cancelación' })
  @IsString()
  @IsOptional()
  cancellation_reason?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkUpdateStatusDto {
  @ApiProperty({ description: 'Lista de IDs de pedidos' })
  @IsArray()
  @IsString({ each: true })
  order_ids: string[];

  @ApiProperty({ description: 'Nuevo estado para los pedidos', enum: ['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'] })
  @IsEnum(['NO_CONFIRMED', 'CONTACTED', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED'])
  status: string;

  @ApiPropertyOptional({ description: 'Número de tracking' })
  @IsString()
  @IsOptional()
  tracking_number?: string;

  @ApiPropertyOptional({ description: 'ID del courier' })
  @IsString()
  @IsOptional()
  courier_id?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsString()
  @IsOptional()
  notes?: string;
}
