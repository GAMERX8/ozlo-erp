import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadDto } from './dto/create-upload.dto';
import { StorageService } from './storage.service';

@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presign-upload')
  createPresignedUpload(@Request() req, @Body() dto: CreateUploadDto) {
    return this.storageService.createPresignedUpload(req.user.userId, dto);
  }

  @Post('complete-upload')
  completeUpload(@Request() req, @Body() dto: CompleteUploadDto) {
    return this.storageService.completeUpload(req.user.userId, dto);
  }

  @Get('files/:id/url')
  getSignedFileUrl(@Request() req, @Param('id') fileId: string) {
    return this.storageService.getSignedFileUrl(req.user.userId, fileId);
  }
}
