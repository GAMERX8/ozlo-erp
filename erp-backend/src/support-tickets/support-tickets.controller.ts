import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto as CreateTicketDtoInput, UpdateTicketDto as UpdateTicketDtoInput, AssignTicketDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Interfaces para el servicio con tipos literales
type TicketType = 'RETURN' | 'EXCHANGE' | 'WARRANTY' | 'COMPLAINT' | 'QUESTION' | 'OTHER';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';

interface CreateTicketDto {
  order_id?: string;
  type: TicketType;
  priority?: TicketPriority;
  subject: string;
  description: string;
}

interface UpdateTicketDto {
  type?: TicketType;
  priority?: TicketPriority;
  status?: TicketStatus;
  subject?: string;
  description?: string;
  resolution?: string;
}

@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateTicketDtoInput,
    @Request() req,
  ) {
    const createTicketDto: CreateTicketDto = {
      order_id: dto.order_id,
      type: dto.type as TicketType,
      priority: dto.priority as TicketPriority,
      subject: dto.subject,
      description: dto.description,
    };
    return this.supportTicketsService.create(workspaceId, createTicketDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('orderId') orderId?: string,
  ) {
    // orderId se puede usar para filtrar tickets de una orden específica
    // pero el servicio no lo soporta directamente, así que lo omitimos aquí
    return this.supportTicketsService.findAll(workspaceId, { status, type, priority });
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.supportTicketsService.getStats(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.supportTicketsService.findOne(id, workspaceId);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.supportTicketsService.getComments(id, workspaceId);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { content: string; is_internal?: boolean },
    @Request() req,
  ) {
    return this.supportTicketsService.addComment(id, workspaceId, req.user.id, body.content, body.is_internal);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateTicketDtoInput,
    @Request() req,
  ) {
    const updateTicketDto: UpdateTicketDto = {
      type: dto.type as TicketType,
      priority: dto.priority as TicketPriority,
      status: dto.status as TicketStatus,
      subject: dto.subject,
      description: dto.description,
      resolution: dto.resolution,
    };
    return this.supportTicketsService.update(id, workspaceId, updateTicketDto, req.user.id);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() assignDto: AssignTicketDto,
    @Request() req,
  ) {
    return this.supportTicketsService.assign(id, workspaceId, assignDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.supportTicketsService.remove(id, workspaceId, req.user.id);
  }
}
