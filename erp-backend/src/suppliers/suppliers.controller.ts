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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createSupplierDto: CreateSupplierDto,
    @Request() req,
  ) {
    return this.suppliersService.create(workspaceId, createSupplierDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.suppliersService.findAll(workspaceId, activeFilter, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.suppliersService.findOne(id, workspaceId);
  }

  @Get(':id/products')
  getProducts(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.suppliersService.getProducts(id, workspaceId);
  }

  @Get(':id/purchase-orders')
  getPurchaseOrders(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.suppliersService.getPurchaseOrders(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Request() req,
  ) {
    return this.suppliersService.update(id, workspaceId, updateSupplierDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.suppliersService.remove(id, workspaceId, req.user.id);
  }
}
