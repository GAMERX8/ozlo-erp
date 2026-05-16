import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCashClosureDto {
  @IsNumber()
  @Type(() => Number)
  initial_amount: number;
}

export class CloseCashClosureDto {
  @IsNumber()
  @Type(() => Number)
  adjustment_amount?: number;

  @IsString()
  @IsOptional()
  adjustment_note?: string;
}
