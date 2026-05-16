import { IsString, IsOptional } from 'class-validator';

export class UpdateWorkspaceDto {
    @IsString()
    @IsOptional()
    name?: string;

    // Nota: El slug (UUID) no se puede modificar después de la creación

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    website?: string;
}
