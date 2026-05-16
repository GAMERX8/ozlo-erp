import { IsString, IsOptional } from 'class-validator';

export class CreateInstanceWithPlanDto {
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

    // Plan seleccionado (para nuevos workspaces) - se valida contra la DB
    @IsString()
    @IsOptional()
    plan?: string;
}
