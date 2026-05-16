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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createWarehouseDto: CreateWarehouseDto,
    @Request() req,
  ) {
    return this.warehousesService.create(workspaceId, createWarehouseDto, req.user.id);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.warehousesService.findAll(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.warehousesService.findOne(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @Request() req,
  ) {
    return this.warehousesService.update(id, workspaceId, updateWarehouseDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.warehousesService.remove(id, workspaceId, req.user.id);
  }
}
