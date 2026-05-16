import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body('name') name: string,
    @Body('expiresAt') expiresAt: string,
    @Request() req,
  ) {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.resolve(process.cwd(), 'auth.log');
    const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    log(`Controller: POST /api-keys?workspaceId=${workspaceId}, name=${name}, user=${req.user?.userId}`);

    let expiryDate: Date | undefined = undefined;
    if (expiresAt) {
      expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        expiryDate = undefined;
      }
    }
    
    return this.apiKeysService.create(req.user.userId, workspaceId, name, expiryDate);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId: string) {
    return this.apiKeysService.findAll(workspaceId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.apiKeysService.remove(id, req.user.userId, workspaceId);
  }

  @Patch(':id/regenerate')
  regenerate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.apiKeysService.regenerate(id, req.user.userId, workspaceId);
  }
}
