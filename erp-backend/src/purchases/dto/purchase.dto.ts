import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsString()
  product_id: string;

  @IsString()
  @IsOptional()
  variant_id?: string;

  @IsNumber()
  @Type(() => Number)
  quantity_ordered: number;

  @IsNumber()
  @Type(() => Number)
  unit_cost: number;
}

export class ReceiveItemDto {
  @IsString()
  item_id: string;

  @IsNumber()
  @Type(() => Number)
  quantity_received: number;
}

export class CreatePurchaseDto {
  @IsString()
  supplier_id: string;

  @IsString()
  warehouse_id: string;

  @IsDateString()
  @IsOptional()
  expected_date?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tax_amount?: number;

  @IsString()
  @IsOptional()
  invoice_number?: string;

  @IsString()
  @IsOptional()
  invoice_url?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class UpdatePurchaseDto {
  @IsString()
  @IsOptional()
  supplier_id?: string;

  @IsString()
  @IsOptional()
  warehouse_id?: string;

  @IsEnum(['DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  expected_date?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tax_amount?: number;

  @IsString()
  @IsOptional()
  invoice_number?: string;

  @IsString()
  @IsOptional()
  invoice_url?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];
}

export class ReceivePurchaseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
