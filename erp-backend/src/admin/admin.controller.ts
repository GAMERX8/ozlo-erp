import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly auditService: AuditService,
    ) { }

    // ==================== DASHBOARD ====================

    @Get('dashboard')
    getDashboardStats() {
        return this.adminService.getDashboardStats();
    }

    // ==================== USERS ====================

    @Get('users')
    getAllUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.adminService.getAllUsers({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            search,
        });
    }

    @Get('users/:id')
    getUserById(@Param('id') id: string) {
        return this.adminService.getUserById(id);
    }

    @Patch('users/:id/role')
    updateUserRole(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
    ) {
        return this.adminService.updateUserRole(id, dto);
    }

    @Delete('users/:id')
    deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(id);
    }

    // ==================== WORKSPACES ====================

    @Get('workspaces')
    getAllWorkspaces(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.adminService.getAllWorkspaces({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            search,
        });
    }

    @Get('workspaces/:id')
    getWorkspaceById(@Param('id') id: string) {
        return this.adminService.getWorkspaceById(id);
    }

    @Delete('workspaces/:id')
    deleteWorkspace(@Param('id') id: string) {
        return this.adminService.deleteWorkspace(id);
    }

    // ==================== PLANS & BILLING ====================

    @Get('plans')
    getAllPlans() {
        return this.adminService.getAllPlans();
    }

    @Post('plans')
    createPlan(@Body() body: any) {
        return this.adminService.createPlan(body);
    }

    @Patch('plans/config/:id')
    updatePlan(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updatePlan(id, body);
    }

    @Delete('plans/config/:id')
    deletePlan(@Param('id') id: string) {
        return this.adminService.deletePlan(id);
    }

    @Get('plans/active')
    getAllActivePlans(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.adminService.getAllActivePlans({
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            status,
        });
    }

    @Get('plans/:id')
    getPlanById(@Param('id') id: string) {
        return this.adminService.getPlanById(id);
    }

    @Patch('plans/:id/status')
    updatePlanStatus(
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.adminService.updatePlanStatus(id, status);
    }

    // ==================== AUDIT LOGS ====================

    @Get('audit-logs')
    getAuditLogs(
        @Query('workspaceId') workspaceId?: string,
        @Query('actorId') actorId?: string,
        @Query('action') action?: string,
        @Query('entityType') entityType?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.auditService.getLogs({
            workspaceId,
            actorId,
            action,
            entityType,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
        });
    }

    @Get('audit-actions')
    getAuditActions() {
        return {
            actions: [
                'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED',
                'USER_PASSWORD_CHANGED', 'USER_PASSWORD_RESET',
                'USER_EMAIL_VERIFIED', 'USER_MFA_ENABLED', 'USER_MFA_DISABLED',
                'WORKSPACE_CREATED', 'WORKSPACE_UPDATED', 'WORKSPACE_DELETED',
                'MEMBER_INVITED', 'MEMBER_INVITATION_ACCEPTED',
                'MEMBER_INVITATION_REJECTED', 'MEMBER_INVITATION_CANCELED',
                'MEMBER_REMOVED', 'MEMBER_LEFT',
                'ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_STATUS_UPDATED',
                'COURIER_CREATED', 'COURIER_UPDATED', 'COURIER_DELETED',
                'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED',
                'PURCHASE_CREATED', 'PURCHASE_RECEIVED',
                'SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_UPDATED',
                
            ],
        };
    }

    
}
