import { IsString, IsOptional, IsNotEmpty, IsNumber, IsEnum, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Camiseta de Algodón' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'SKU del producto', example: 'CAM-ALG-001' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Descripción en formato HTML' })
  @IsString()
  @IsOptional()
  description_html?: string;

  @ApiPropertyOptional({ description: 'Galería de imágenes (URLs)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];

  @ApiProperty({ description: 'Precio de venta', example: 29.90 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Costo de adquisición', example: 15.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional({ description: 'Stock mínimo para alertas', example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  min_stock?: number;

  @ApiPropertyOptional({ description: 'ID de la categoría' })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Unidad de medida', example: 'und' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Stock inicial', example: 10 })
  @IsNumber()
  @IsOptional()
  initial_stock?: number;

  @ApiPropertyOptional({ description: 'ID del almacén inicial' })
  @IsString()
  @IsOptional()
  warehouse_id?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Nombre del producto' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'SKU del producto' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Descripción en formato HTML' })
  @IsString()
  @IsOptional()
  description_html?: string;

  @ApiPropertyOptional({ description: 'Galería de imágenes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];

  @ApiPropertyOptional({ description: 'Precio de venta' })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Costo de adquisición' })
  @IsNumber()
  @IsOptional()
  cost?: number;

  @ApiPropertyOptional({ description: 'Stock mínimo' })
  @IsNumber()
  @IsOptional()
  min_stock?: number;

  @ApiPropertyOptional({ description: 'ID de la categoría' })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Unidad de medida' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Estado del producto', example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
