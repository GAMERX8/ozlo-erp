import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Post()
    createInvitation(
        @Request() req,
        @Body() data: { workspace_id: string; email: string; role?: string }
    ) {
        return this.invitationsService.createInvitation(
            req.user.userId,
            data.workspace_id,
            data.email,
            data.role
        );
    }

    @Get('pending')
    getPendingInvitations(@Request() req) {
        return this.invitationsService.getPendingInvitations(req.user.userId);
    }

    @Get('workspace/:workspaceId')
    getWorkspaceInvitations(
        @Request() req,
        @Param('workspaceId') workspaceId: string
    ) {
        return this.invitationsService.getWorkspaceInvitations(req.user.userId, workspaceId);
    }

    @Post(':id/accept')
    acceptInvitation(
        @Request() req,
        @Param('id') invitationId: string
    ) {
        return this.invitationsService.acceptInvitation(req.user.userId, invitationId);
    }

    @Post(':id/reject')
    rejectInvitation(
        @Request() req,
        @Param('id') invitationId: string
    ) {
        return this.invitationsService.rejectInvitation(req.user.userId, invitationId);
    }

    @Delete(':id')
    cancelInvitation(
        @Request() req,
        @Param('id') invitationId: string
    ) {
        return this.invitationsService.cancelInvitation(req.user.userId, invitationId);
    }
}
