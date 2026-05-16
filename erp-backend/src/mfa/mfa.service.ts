import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, AuditActions } from '../audit/audit.service';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Generar nuevo secret MFA para un usuario
  async generateSecret(userId: string, email: string) {
    // Verificar que no tenga MFA ya activo
    const existing = await this.prisma.mfaSecret.findUnique({
      where: { user_id: userId },
    });

    if (existing?.enabled_at) {
      throw new BadRequestException('MFA is already enabled');
    }

    // Generar secret
    const appName = process.env.APP_NAME || 'SaaS Template';
    const secret = speakeasy.generateSecret({
      name: `${appName} (${email})`,
      issuer: appName,
    });

    // Encriptar el secret antes de guardar (simple base64 por ahora, en prod usar algo más fuerte)
    const encryptedSecret = Buffer.from(secret.base32).toString('base64');

    // Generar backup codes (10 códigos de 8 caracteres)
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    const hashedBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Guardar en DB
    await this.prisma.mfaSecret.upsert({
      where: { user_id: userId },
      update: {
        secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
        enabled_at: null,
        verified_at: null,
      },
      create: {
        user_id: userId,
        secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
      },
    });

    // Generar QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32, // Mostrar al usuario por si no puede escanear QR
      qrCode: qrCodeUrl,
      backupCodes, // Mostrar UNA SOLA VEZ al usuario
    };
  }

  // Verificar código TOTP y activar MFA
  async verifyAndEnable(userId: string, code: string) {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { user_id: userId },
    });

    if (!mfaSecret) {
      throw new BadRequestException('MFA setup not started');
    }

    if (mfaSecret.enabled_at) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = Buffer.from(mfaSecret.secret, 'base64').toString();

    // Verificar código
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2, // Permitir 2 intervalos de tiempo (30 segundos antes/después)
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    // Activar MFA
    await this.prisma.$transaction([
      this.prisma.mfaSecret.update({
        where: { user_id: userId },
        data: {
          enabled_at: new Date(),
          verified_at: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfa_enabled: true },
      }),
    ]);

    // Audit log
    await this.auditService.log({
      action: AuditActions.USER_MFA_ENABLED,
      entityType: 'user',
      entityId: userId,
      actorId: userId,
    });

    return { success: true };
  }

  // Verificar código TOTP (para login)
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mfaSecret.findUnique({
      where: { user_id: userId },
    });

    if (!mfaSecret || !mfaSecret.enabled_at) {
      return false;
    }

    const secret = Buffer.from(mfaSecret.secret, 'base64').toString();

    // Verificar si es código TOTP normal
    const isValidTotp = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (isValidTotp) {
      return true;
    }

    // Verificar si es backup code
    const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
    if (mfaSecret.backup_codes.includes(hashedCode)) {
      // Remover backup code usado (one-time use)
      await this.prisma.mfaSecret.update({
        where: { user_id: userId },
        data: {
          backup_codes: mfaSecret.backup_codes.filter(c => c !== hashedCode),
        },
      });
      return true;
    }

    return false;
  }

  // Desactivar MFA
  async disable(userId: string, code: string) {
    const isValid = await this.verifyCode(userId, code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.$transaction([
      this.prisma.mfaSecret.delete({
        where: { user_id: userId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfa_enabled: false },
      }),
    ]);

    // Audit log
    await this.auditService.log({
      action: AuditActions.USER_MFA_DISABLED,
      entityType: 'user',
      entityId: userId,
      actorId: userId,
    });

    return { success: true };
  }

  // Obtener estado MFA del usuario
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfa_enabled: true },
    });

    return {
      enabled: user?.mfa_enabled || false,
    };
  }

  // Regenerar backup codes
  async regenerateBackupCodes(userId: string, code: string) {
    const isValid = await this.verifyCode(userId, code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    const newBackupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    const hashedBackupCodes = newBackupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    await this.prisma.mfaSecret.update({
      where: { user_id: userId },
      data: { backup_codes: hashedBackupCodes },
    });

    return { backupCodes: newBackupCodes };
  }
}
