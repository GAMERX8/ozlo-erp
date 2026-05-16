import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class CreateInvitationDto {
    @IsString()
    workspace_id: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    @IsIn(['admin', 'member'])
    role?: string = 'member'; // Por defecto, los invitados son miembros
}
