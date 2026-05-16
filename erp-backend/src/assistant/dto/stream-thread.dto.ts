import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StreamAssistantThreadDto {
  @IsString()
  @MaxLength(12000)
  prompt: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model_key?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  attachment_ids?: string[];
}
