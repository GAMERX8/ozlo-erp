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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto as CreatePurchaseDtoInput, UpdatePurchaseDto as UpdatePurchaseDtoInput, ReceivePurchaseDto as ReceivePurchaseDtoInput } from './dto/purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Interfaces para el servicio (transformadas)
interface CreatePurchaseDto {
  supplier_id: string;
  warehouse_id: string;
  expected_date?: Date;
  invoice_number?: string;
  notes?: string;
  items: {
    product_id: string;
    variant_id?: string;
    quantity_ordered: number;
    unit_cost: number;
  }[];
}

interface UpdatePurchaseDto {
  supplier_id?: string;
  warehouse_id?: string;
  expected_date?: Date;
  invoice_number?: string;
  notes?: string;
  status?: string;
}

interface ReceiveItemDto {
  purchase_item_id: string;
  quantity_received: number;
}

interface ReceivePurchaseDto {
  items: ReceiveItemDto[];
  invoice_url?: string;
}

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreatePurchaseDtoInput,
    @Request() req,
  ) {
    const createPurchaseDto: CreatePurchaseDto = {
      ...dto,
      expected_date: dto.expected_date ? new Date(dto.expected_date) : undefined,
    };
    return this.purchasesService.create(workspaceId, createPurchaseDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasesService.findAll(workspaceId, {
      status,
      supplier_id: supplierId,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  getStats(@Query('workspaceId') workspaceId: string) {
    return this.purchasesService.getStats(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.purchasesService.findOne(id, workspaceId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.purchasesService.remove(id, workspaceId, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdatePurchaseDtoInput,
    @Request() req,
  ) {
    const updatePurchaseDto: UpdatePurchaseDto = {
      ...dto,
      expected_date: dto.expected_date ? new Date(dto.expected_date) : undefined,
    };
    return this.purchasesService.update(id, workspaceId, updatePurchaseDto, req.user.id);
  }

  @Post(':id/receive')
  receive(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ReceivePurchaseDtoInput,
    @Request() req,
  ) {
    const receiveDto: ReceivePurchaseDto = {
      items: dto.items.map(item => ({
        purchase_item_id: item.item_id,
        quantity_received: item.quantity_received,
      })),
      invoice_url: dto.notes, // El DTO tiene notes en lugar de invoice_url
    };
    return this.purchasesService.receive(id, workspaceId, receiveDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.purchasesService.remove(id, workspaceId, req.user.id);
  }
}
