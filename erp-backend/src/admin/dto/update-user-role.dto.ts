import { IsString, IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
    @IsString()
    @IsEnum(['user', 'admin', 'super_admin'])
    role: string;
}
