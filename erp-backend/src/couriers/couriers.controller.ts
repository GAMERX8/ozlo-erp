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
import { CouriersService } from './couriers.service';
import { CreateCourierDto, UpdateCourierDto } from './dto/courier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('couriers')
@UseGuards(JwtAuthGuard)
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @Post()
  create(
    @Query('workspaceId') queryWorkspaceId: string,
    @Body() createCourierDto: CreateCourierDto,
    @Request() req,
  ) {
    const workspaceId = queryWorkspaceId || createCourierDto.workspace_id;
    console.log('--- Creating Courier ---');
    console.log('Query WorkspaceId:', queryWorkspaceId);
    console.log('Body WorkspaceId:', createCourierDto.workspace_id);
    console.log('Resulting WorkspaceId:', workspaceId);
    return this.couriersService.create(workspaceId, createCourierDto, req.user.id);
  }

  @Get('stats/all')
  getAllCouriersStats(@Query('workspaceId') workspaceId: string) {
    return this.couriersService.getAllCouriersStats(workspaceId);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.couriersService.findAll(workspaceId, activeFilter);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.couriersService.findOne(id, workspaceId);
  }

  @Get(':id/stats')
  getCourierStats(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.couriersService.getCourierStats(id, workspaceId);
  }

  @Get(':id/orders')
  getCourierOrders(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.couriersService.getCourierOrders(id, workspaceId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateCourierDto: UpdateCourierDto,
    @Request() req,
  ) {
    return this.couriersService.update(id, workspaceId, updateCourierDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.couriersService.remove(id, workspaceId, req.user.id);
  }
}