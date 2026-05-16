import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('kardex/:productId')
  getKardex(
    @Param('productId') productId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.inventoryService.getKardex(productId, workspaceId);
  }

  @Get('product/:productId/total')
  getProductTotalStock(@Param('productId') productId: string) {
    return this.inventoryService.getProductTotalStock(productId);
  }

  @Get('product/:productId/by-warehouse')
  getProductStockByWarehouse(@Param('productId') productId: string) {
    return this.inventoryService.getProductStockByWarehouse(productId);
  }

  @Get('low-stock')
  getLowStock(@Query('workspaceId') workspaceId: string, @Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStockAlerts(workspaceId, threshold ? parseInt(threshold) : 5);
  }
}