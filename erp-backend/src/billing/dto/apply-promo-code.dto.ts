import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ApplyPromoCodeDto {
    @IsUUID()
    @IsNotEmpty()
    workspace_id: string;

    @IsString()
    @IsNotEmpty()
    promo_code: string;
}
