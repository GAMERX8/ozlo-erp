import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  // Iniciar setup MFA (generar QR y secret)
  @Post('setup')
  async setup(@Request() req: RequestWithUser) {
    const result = await this.mfaService.generateSecret(
      req.user.userId,
      req.user.email,
    );
    return {
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
    };
  }

  // Verificar código y activar MFA
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
  ) {
    await this.mfaService.verifyAndEnable(req.user.userId, code);
    return { success: true, message: 'MFA enabled successfully' };
  }

  // Verificar código (para login step 2)
  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  async verifyLogin(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
  ) {
    const isValid = await this.mfaService.verifyCode(req.user.userId, code);
    if (!isValid) {
      return { valid: false, message: 'Invalid code' };
    }
    return { valid: true };
  }

  // Desactivar MFA
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
  ) {
    await this.mfaService.disable(req.user.userId, code);
    return { success: true, message: 'MFA disabled' };
  }

  // Obtener estado MFA
  @Get('status')
  async getStatus(@Request() req: RequestWithUser) {
    return this.mfaService.getStatus(req.user.userId);
  }

  // Regenerar backup codes
  @Post('backup-codes')
  async regenerateBackupCodes(
    @Request() req: RequestWithUser,
    @Body('code') code: string,
  ) {
    const result = await this.mfaService.regenerateBackupCodes(
      req.user.userId,
      code,
    );
    return {
      success: true,
      backupCodes: result.backupCodes,
    };
  }
}
