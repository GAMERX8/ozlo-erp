import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsOptional()
  order_id?: string;

  @IsEnum(['RETURN', 'EXCHANGE', 'WARRANTY', 'COMPLAINT', 'QUESTION', 'OTHER'])
  type: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;
}

export class UpdateTicketDto {
  @IsEnum(['RETURN', 'EXCHANGE', 'WARRANTY', 'COMPLAINT', 'QUESTION', 'OTHER'])
  @IsOptional()
  type?: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: string;

  @IsEnum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  resolution?: string;
}

export class AssignTicketDto {
  @IsString()
  assigned_to: string;
}
