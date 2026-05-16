import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class CreateCourierDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  tracking_url?: string;

  @IsString()
  @IsOptional()
  document_type?: string;

  @IsString()
  @IsOptional()
  document_number?: string;

  @IsString()
  @IsOptional()
  vehicle_type?: string;

  @IsString()
  @IsOptional()
  license_plate?: string;

  @IsString()
  @IsOptional()
  workspace_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateCourierDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  tracking_url?: string;

  @IsString()
  @IsOptional()
  document_type?: string;

  @IsString()
  @IsOptional()
  document_number?: string;

  @IsString()
  @IsOptional()
  vehicle_type?: string;

  @IsString()
  @IsOptional()
  license_plate?: string;

  @IsString()
  @IsOptional()
  workspace_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
