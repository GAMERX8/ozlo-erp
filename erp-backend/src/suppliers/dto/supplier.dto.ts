import { IsString, IsOptional, IsBoolean, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsEnum(['RUC', 'DNI'])
  @IsOptional()
  document_type?: string;

  @IsString()
  document_number: string;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  payment_terms?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  lead_time_days?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateSupplierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['RUC', 'DNI'])
  @IsOptional()
  document_type?: string;

  @IsString()
  @IsOptional()
  document_number?: string;

  @IsString()
  @IsOptional()
  contact_name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  payment_terms?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  lead_time_days?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
