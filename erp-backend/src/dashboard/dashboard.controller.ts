import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':workspaceId/dashboard/kpis')
  getKpis(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getKpis(workspaceId);
  }

  @Get(':workspaceId/analytics/sales-over-time')
  getSalesOverTime(
    @Param('workspaceId') workspaceId: string,
    @Query('period') period?: string,
  ) {
    return this.dashboardService.getSalesOverTime(workspaceId, period);
  }

  @Get(':workspaceId/analytics/orders-by-status')
  getOrdersByStatus(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getOrdersByStatus(workspaceId);
  }

  @Get(':workspaceId/analytics/top-products')
  getTopProducts(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getTopProducts(workspaceId, limit ? parseInt(limit) : 10);
  }

  @Get(':workspaceId/orders/recent')
  getRecentOrders(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentOrders(workspaceId, limit ? parseInt(limit) : 10);
  }

  @Get(':workspaceId/inventory/low-stock')
  getLowStockAlerts(
    @Param('workspaceId') workspaceId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.dashboardService.getLowStockAlerts(workspaceId, threshold ? parseInt(threshold) : 5);
  }

  @Get(':workspaceId/analytics/sales')
  getSalesAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSalesAnalytics(workspaceId, startDate, endDate);
  }

  @Get(':workspaceId/analytics/inventory')
  getInventoryAnalytics(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getInventoryAnalytics(workspaceId);
  }

  @Get(':workspaceId/analytics/operations')
  getOperationsAnalytics(@Param('workspaceId') workspaceId: string) {
    return this.dashboardService.getOperationsAnalytics(workspaceId);
  }
}