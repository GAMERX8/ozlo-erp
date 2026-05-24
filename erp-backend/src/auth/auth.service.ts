import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuditService, AuditActions } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly workspacesService: WorkspacesService,
        private readonly auditService: AuditService,
    ) { }

    async register(dto: RegisterDto) {
        // Verificar si el email ya existe
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            // Si el usuario existe y se registró vía OAuth (Google, etc.)
            if (existingUser.provider !== 'local') {
                throw new BadRequestException(
                    `Este correo ya está registrado con ${existingUser.provider === 'google' ? 'Google' : existingUser.provider}. Por favor inicia sesión con esa opción.`
                );
            }
            // Si es usuario local, el error de Prisma lo manejará (unique constraint)
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        
        // Generar token de verificación
        const verifyToken = randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                first_name: dto.first_name,
                last_name: dto.last_name,
                phone: dto.phone,
                email_verify_token: verifyToken,
                email_verify_expires: verifyExpires,
            },
        });

        // Crear workspace automáticamente para el nuevo usuario
        try {
            const fullName = [dto.first_name, dto.last_name].filter(Boolean).join(' ') || 'Mi';
            this.logger.log(`Creating workspace for user ${user.id}`);
            const workspace = await this.workspacesService.create(user.id, {
                name: `${fullName} Workspace`,
            });
            this.logger.debug(`Workspace created successfully for user ${user.id}`);
        } catch (workspaceError) {
            this.logger.error(`Failed to create workspace for user ${user.id}`, workspaceError);
            // No lanzamos error para no interrumpir el registro, pero loggeamos el problema
        }

        // Enviar email de verificación
        try {
            await this.mailService.sendVerificationEmail(
                user.email,
                verifyToken,
                user.first_name || undefined
            );
        } catch (emailError) {
            this.logger.error(`Failed to send verification email to ${user.email}`, emailError);
            // Continuamos el flujo aunque el email falle para no bloquear la creación de la cuenta
        }

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_REGISTERED,
            entityType: 'user',
            entityId: user.id,
            actorId: user.id,
            metadata: { provider: 'local', email: user.email },
        });

        const { password, email_verify_token, email_verify_expires, ...result } = user;
        return {
            ...result,
            message: 'Usuario registrado. Por favor verifica tu correo electrónico.',
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Si el usuario existe pero fue registrado vía OAuth (no tiene password)
        if (user.provider !== 'local' || !user.password) {
            throw new UnauthorizedException(
                `Este correo está registrado con ${user.provider === 'google' ? 'Google' : user.provider}. Por favor inicia sesión con esa opción.`
            );
        }

        if (!(await bcrypt.compare(dto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.email_verified) {
            throw new UnauthorizedException('Por favor verifica tu correo electrónico antes de iniciar sesión');
        }

        // Si tiene MFA habilitado, solo devolver token temporal
        if (user.mfa_enabled) {
            // Token temporal de 5 minutos solo para completar MFA
            const tempPayload = { 
                sub: user.id, 
                email: user.email, 
                mfa_pending: true 
            };
            
            return {
                access_token: this.jwtService.sign(tempPayload, { expiresIn: '5m' }),
                mfa_required: true,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                },
            };
        }

        const payload = { sub: user.id, email: user.email, role: user.role };

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_LOGIN,
            entityType: 'user',
            entityId: user.id,
            actorId: user.id,
            metadata: { mfa_used: false },
        });

        return {
            access_token: this.jwtService.sign(payload),
            mfa_required: false,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
                role: user.role,
            },
        };
    }

    async verifyMfaAndLogin(userId: string, code: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { mfa_secret: true },
        });

        if (!user || !user.mfa_enabled || !user.mfa_secret) {
            throw new UnauthorizedException('MFA not enabled');
        }

        // Verificar código TOTP
        const secret = Buffer.from(user.mfa_secret.secret, 'base64').toString();
        
        const isValidTotp = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: code,
            window: 2,
        });

        // Verificar backup codes
        let isValidBackup = false;
        const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
        
        if (user.mfa_secret.backup_codes.includes(hashedCode)) {
            isValidBackup = true;
            // Remover backup code usado
            await this.prisma.mfaSecret.update({
                where: { user_id: userId },
                data: {
                    backup_codes: user.mfa_secret.backup_codes.filter(c => c !== hashedCode),
                },
            });
        }

        if (!isValidTotp && !isValidBackup) {
            throw new UnauthorizedException('Invalid MFA code');
        }

        // Generar token completo
        const payload = { sub: user.id, email: user.email, role: user.role };

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_LOGIN,
            entityType: 'user',
            entityId: user.id,
            actorId: user.id,
            metadata: { mfa_used: true, backup_code_used: isValidBackup },
        });

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
                role: user.role,
            },
        };
    }

    async validateUser(userId: string) {
        return this.prisma.user.findUnique({ where: { id: userId } });
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                first_name: dto.first_name,
                last_name: dto.last_name,
            },
        });

        const { password, email_verify_token, email_verify_expires, ...result } = user;
        return result;
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new BadRequestException('La contraseña actual es incorrecta');
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_PASSWORD_CHANGED,
            entityType: 'user',
            entityId: userId,
            actorId: userId,
        });

        return { success: true, message: 'Contraseña actualizada exitosamente' };
    }

    // ==================== EMAIL VERIFICATION ====================

    async verifyEmail(token: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                email_verify_token: token,
                email_verify_expires: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            throw new BadRequestException('Token inválido o expirado');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                email_verified: true,
                email_verify_token: null,
                email_verify_expires: null,
            },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_EMAIL_VERIFIED,
            entityType: 'user',
            entityId: user.id,
            actorId: user.id,
        });

        return { success: true, message: 'Email verificado exitosamente' };
    }

    async resendVerificationEmail(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException('Usuario no encontrado');
        }

        if (user.email_verified) {
            throw new BadRequestException('El email ya está verificado');
        }

        // Generar nuevo token
        const verifyToken = randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                email_verify_token: verifyToken,
                email_verify_expires: verifyExpires,
            },
        });

        await this.mailService.sendVerificationEmail(
            user.email,
            verifyToken,
            user.first_name || undefined
        );

        return { success: true, message: 'Email de verificación reenviado' };
    }

    // ==================== PASSWORD RESET ====================

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            // No revelar si el email existe por seguridad
            return { success: true, message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
        }

        // Generar token
        const resetToken = randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await this.prisma.passwordReset.create({
            data: {
                token: resetToken,
                expires: resetExpires,
                user_id: user.id,
            },
        });

        await this.mailService.sendPasswordResetEmail(
            user.email,
            resetToken,
            user.first_name || undefined
        );

        return { success: true, message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const resetRecord = await this.prisma.passwordReset.findFirst({
            where: {
                token: dto.token,
                expires: {
                    gt: new Date(),
                },
                used: false,
            },
            include: { user: true },
        });

        if (!resetRecord) {
            throw new BadRequestException('Token inválido o expirado');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        // Update password
        await this.prisma.user.update({
            where: { id: resetRecord.user_id },
            data: { password: hashedPassword },
        });

        // Mark token as used
        await this.prisma.passwordReset.update({
            where: { id: resetRecord.id },
            data: { used: true },
        });

        // Audit log
        await this.auditService.log({
            action: AuditActions.USER_PASSWORD_RESET,
            entityType: 'user',
            entityId: resetRecord.user_id,
            actorId: resetRecord.user_id,
        });

        return { success: true, message: 'Contraseña restablecida exitosamente' };
    }

    // ==================== OAUTH (GOOGLE) ====================

    async validateOAuthLogin(oauthUser: {
        provider: string;
        providerId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        picture?: string;
    }) {
        // Buscar usuario por provider + providerId
        let user = await this.prisma.user.findUnique({
            where: {
                provider_provider_id: {
                    provider: oauthUser.provider,
                    provider_id: oauthUser.providerId,
                },
            },
        });

        // Si no existe, buscar por email para vincular cuenta
        if (!user) {
            const existingUserByEmail = await this.prisma.user.findUnique({
                where: { email: oauthUser.email },
            });

            if (existingUserByEmail) {
                // Vincular cuenta OAuth al usuario existente
                user = await this.prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: {
                        provider: oauthUser.provider,
                        provider_id: oauthUser.providerId,
                        avatar: oauthUser.picture || existingUserByEmail.avatar,
                        email_verified: true,
                    },
                });
            } else {
                // Crear nuevo usuario OAuth
                user = await this.prisma.user.create({
                    data: {
                        email: oauthUser.email,
                        provider: oauthUser.provider,
                        provider_id: oauthUser.providerId,
                        first_name: oauthUser.firstName,
                        last_name: oauthUser.lastName,
                        avatar: oauthUser.picture,
                        email_verified: true, // OAuth emails are verified
                        role: 'user',
                    },
                });

                // Crear workspace automáticamente para el nuevo usuario
                try {
                    const fullName = [oauthUser.firstName, oauthUser.lastName].filter(Boolean).join(' ') || 'Mi';
                    this.logger.log(`Creating workspace for OAuth user ${user.id}`);
                    await this.workspacesService.create(user.id, {
                        name: `${fullName} Workspace`,
                    });
                } catch (workspaceError) {
                    this.logger.error(`Failed to create workspace for OAuth user ${user.id}`, workspaceError);
                }
            }
        }

        // Generar JWT
        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                email_verified: user.email_verified,
                role: user.role,
                avatar: user.avatar,
                provider: user.provider,
            },
        };
    }
}
