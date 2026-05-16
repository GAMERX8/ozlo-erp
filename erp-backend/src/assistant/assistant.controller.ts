import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import { CreateAssistantThreadDto } from './dto/create-thread.dto';
import { StreamAssistantThreadDto } from './dto/stream-thread.dto';

@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('models')
  getModels() {
    return this.assistantService.getModels();
  }

  @Get('threads')
  listThreads(@Request() req, @Query('workspace_id') workspaceId: string) {
    return this.assistantService.listThreads(req.user.userId, workspaceId);
  }

  @Post('threads')
  createThread(@Request() req, @Body() dto: CreateAssistantThreadDto) {
    return this.assistantService.createThread(req.user.userId, dto);
  }

  @Get('threads/:threadId/messages')
  getThreadMessages(@Request() req, @Param('threadId') threadId: string) {
    return this.assistantService.getThreadMessages(req.user.userId, threadId);
  }

  @Post('threads/:threadId/stream')
  streamThread(
    @Request() req,
    @Param('threadId') threadId: string,
    @Body() dto: StreamAssistantThreadDto,
    @Res() response: Response,
  ) {
    return this.assistantService.streamThreadResponse(req.user.userId, threadId, dto, response);
  }
}
