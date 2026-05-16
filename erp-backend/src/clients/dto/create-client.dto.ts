import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Nombre del cliente', example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Tipo de documento', example: 'DNI', enum: ['DNI', 'RUC', 'CE', 'PASSPORT'] })
  @IsString()
  @IsNotEmpty()
  document_type: string; // DNI | RUC | CE | PASSPORT

  @ApiPropertyOptional({ description: 'Número de documento', example: '12345678' })
  @IsString()
  @IsOptional()
  document_number?: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '987654321' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección', example: 'Av. Las Gardenias 123' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'ID de distrito' })
  @IsString()
  @IsOptional()
  district_id?: string;

  @ApiPropertyOptional({ description: 'Referencia' })
  @IsString()
  @IsOptional()
  reference?: string;
}