import { IsString, IsOptional } from 'class-validator';

export class AddExtraInstanceDto {
    @IsString()
    workspace_id: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    ai_model?: string;

    @IsString()
    @IsOptional()
    integration_channel?: string;

    @IsString()
    @IsOptional()
    bot_token?: string;
}
