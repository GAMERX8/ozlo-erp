import { IsEmail, IsNotEmpty, IsOptional, MinLength, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @IsOptional()
    first_name?: string;

    @IsOptional()
    last_name?: string;

    @IsOptional()
    @IsString()
    @MinLength(8)
    @MaxLength(20)
    phone?: string;
}
