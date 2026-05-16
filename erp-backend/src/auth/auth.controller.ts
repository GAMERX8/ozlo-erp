import { Body, Controller, Post, Patch, Get, Query, UseGuards, Request, BadRequestException, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req) {
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                mfa_enabled: true,
            }
        });
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
        return this.authService.updateProfile(req.user.userId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.userId, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('users/by-email')
    async findUserByEmail(@Query('email') email: string) {
        if (!email) {
            throw new BadRequestException('Email is required');
        }

        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                avatar: true,
            }
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        return user;
    }

    // ==================== EMAIL VERIFICATION ====================

    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Post('resend-verification')
    async resendVerification(@Body() dto: ResendVerificationDto) {
        return this.authService.resendVerificationEmail(dto.email);
    }

    // ==================== PASSWORD RESET ====================

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // ==================== MFA LOGIN ====================

    @UseGuards(JwtAuthGuard)
    @Post('mfa/verify-login')
    async verifyMfaLogin(@Request() req, @Body('code') code: string) {
        // El guard ya validó el token temporal
        if (!req.user.mfa_pending) {
            throw new BadRequestException('MFA not required');
        }
        return this.authService.verifyMfaAndLogin(req.user.userId, code);
    }

    // ==================== GOOGLE OAUTH ====================

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Passport handles the redirect to Google
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(@Req() req, @Res() res: Response) {
        const oauthUser = req.user;
        
        try {
            const result = await this.authService.validateOAuthLogin({
                provider: oauthUser.provider,
                providerId: oauthUser.providerId,
                email: oauthUser.email,
                firstName: oauthUser.firstName,
                lastName: oauthUser.lastName,
                picture: oauthUser.picture,
            });

            // Redirect to frontend with token
            const appUrl = process.env.APP_URL || 'http://localhost:3000';
            const redirectUrl = `${appUrl}/auth/callback?token=${result.access_token}&provider=google`;
            
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('[Google OAuth] Error:', error);
            const appUrl = process.env.APP_URL || 'http://localhost:3000';
            return res.redirect(`${appUrl}/login?error=oauth_failed`);
        }
    }
}
