import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) { }

    @Post()
    create(@Request() req, @Body() dto: CreateWorkspaceDto) {
        return this.workspacesService.create(req.user.userId, dto);
    }

    @Get()
    findAll(@Request() req) {
        return this.workspacesService.findAll(req.user.userId);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.workspacesService.findOne(req.user.userId, id);
    }

    @Get('by-slug/:slug')
    findBySlug(@Request() req, @Param('slug') slug: string) {
        return this.workspacesService.findBySlug(req.user.userId, slug);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() dto: UpdateWorkspaceDto) {
        return this.workspacesService.update(req.user.userId, id, dto);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.workspacesService.remove(req.user.userId, id);
    }

    // ==================== MEMBERS ====================

    @Get(':id/members')
    getMembers(@Request() req, @Param('id') id: string) {
        return this.workspacesService.getMembers(req.user.userId, id);
    }

    @Post(':id/members')
    addMember(
        @Request() req, 
        @Param('id') id: string, 
        @Body() data: { user_id: string }
    ) {
        return this.workspacesService.addMember(req.user.userId, id, data.user_id);
    }

    @Delete(':id/members/:memberId')
    removeMember(
        @Request() req, 
        @Param('id') id: string, 
        @Param('memberId') memberId: string
    ) {
        return this.workspacesService.removeMember(req.user.userId, id, memberId);
    }

    @Post(':id/leave')
    leaveWorkspace(@Request() req, @Param('id') id: string) {
        return this.workspacesService.leaveWorkspace(req.user.userId, id);
    }
}
