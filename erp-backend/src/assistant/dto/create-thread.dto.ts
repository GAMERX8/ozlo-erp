import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAssistantThreadDto {
  @IsUUID()
  workspace_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model_key?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_message?: string;
}
