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
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto, BulkUpdateStatusDto } from './dto/order.dto';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@ApiTags('Pedidos')
@ApiSecurity('x-api-key')
@Controller('orders')
@UseGuards(CombinedAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Crear un nuevo pedido' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createOrderDto: CreateOrderDto,
    @Request() req,
  ) {
    return this.ordersService.create(workspaceId, createOrderDto, req.user.id);
  }

  @ApiOperation({ summary: 'Listar pedidos con filtros' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'status', required: false, isArray: true, type: String })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'courierId', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string | string[],
    @Query('clientId') clientId?: string,
    @Query('courierId') courierId?: string,
    @Query('channel') channel?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll(workspaceId, {
      status,
      clientId,
      courierId,
      channel,
      search,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('stats/summary')
  getStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getStats(workspaceId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.ordersService.findOne(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req,
  ) {
    return this.ordersService.update(id, workspaceId, updateOrderDto, req.user.id);
  }

  @ApiOperation({ summary: 'Actualizar estado de un pedido' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateStatus(id, workspaceId, updateStatusDto, req.user.id);
  }

  @Post('bulk/status')
  bulkUpdateStatus(
    @Query('workspaceId') workspaceId: string,
    @Body() bulkUpdateDto: BulkUpdateStatusDto,
    @Request() req,
  ) {
    return this.ordersService.bulkUpdateStatus(workspaceId, bulkUpdateDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.ordersService.remove(id, workspaceId, req.user.id);
  }
}
