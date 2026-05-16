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
import { CashClosuresService } from './cash-closures.service';
import { CreateCashClosureDto, CloseCashClosureDto } from './dto/cash-closure.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cash-closures')
@UseGuards(JwtAuthGuard)
export class CashClosuresController {
  constructor(private readonly cashClosuresService: CashClosuresService) {}

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() createDto: CreateCashClosureDto,
    @Request() req,
  ) {
    return this.cashClosuresService.create(workspaceId, createDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.cashClosuresService.findAll(workspaceId, status);
  }

  @Get('current')
  getCurrent(@Query('workspaceId') workspaceId: string) {
    return this.cashClosuresService.getCurrent(workspaceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.cashClosuresService.findOne(id, workspaceId);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() closeDto: CloseCashClosureDto,
    @Request() req,
  ) {
    return this.cashClosuresService.close(id, workspaceId, closeDto, req.user.id);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.cashClosuresService.remove(id, workspaceId, req.user.id);
  }
}
