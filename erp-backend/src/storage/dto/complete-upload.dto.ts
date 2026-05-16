import { IsString, IsUUID } from 'class-validator';

export class CompleteUploadDto {
  @IsUUID()
  file_id: string;

  @IsString()
  workspace_id: string;
}
