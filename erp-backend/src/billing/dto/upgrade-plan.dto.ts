import { IsString, IsOptional } from 'class-validator';

export class UpgradePlanDto {
    @IsString()
    workspace_id: string;

    @IsString()
    plan: string;

    @IsString()
    @IsOptional()
    promo_code?: string;
}
