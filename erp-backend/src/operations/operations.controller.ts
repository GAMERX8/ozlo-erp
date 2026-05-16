import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('operations')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('kanban')
  getKanbanBoard(@Query('workspaceId') workspaceId: string) {
    return this.operationsService.getKanbanBoard(workspaceId);
  }

  @Get('stats')
  getOperationsStats(@Query('workspaceId') workspaceId: string) {
    return this.operationsService.getOperationsStats(workspaceId);
  }

  @Post('move')
  moveOrderStatus(
    @Query('workspaceId') workspaceId: string,
    @Body() body: { order_id: string; status: string },
    @Request() req,
  ) {
    return this.operationsService.moveOrderStatus(workspaceId, body.order_id, body.status, req.user.id);
  }

  @Post('quick-action')
  quickAction(
    @Query('workspaceId') workspaceId: string,
    @Body() body: { order_id: string; action: string; courier_id?: string; tracking_number?: string },
    @Request() req,
  ) {
    return this.operationsService.quickAction(
      workspaceId,
      body.order_id,
      body.action,
      req.user.id,
      { courier_id: body.courier_id, tracking_number: body.tracking_number },
    );
  }

  @Get('urgent')
  getUrgentOrders(@Query('workspaceId') workspaceId: string) {
    return this.operationsService.getUrgentOrders(workspaceId);
  }
}