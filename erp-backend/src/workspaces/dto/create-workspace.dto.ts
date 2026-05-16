import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateWorkspaceDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    // Nota: El slug se genera automáticamente como UUID en el servidor
    // No es necesario enviarlo

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    website?: string;
}
