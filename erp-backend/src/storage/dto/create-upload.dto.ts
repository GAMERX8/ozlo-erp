import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateUploadDto {
  @IsString()
  workspace_id: string;

  @IsString()
  @MaxLength(255)
  filename: string;

  @IsString()
  @MaxLength(255)
  content_type: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  size_bytes: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  scope?: string;
}
