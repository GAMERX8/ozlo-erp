import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MailModule } from '../mail/mail.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { InitService } from './init.service';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CombinedAuthGuard } from './guards/combined-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'super-secret',
            signOptions: { expiresIn: '7d' },
        }),
        MailModule,
        forwardRef(() => WorkspacesModule),
        ApiKeysModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        JwtStrategy, 
        GoogleStrategy, 
        InitService,
        PermissionsService,
        PermissionsGuard,
        JwtAuthGuard,
        CombinedAuthGuard,
    ],
    exports: [AuthService, PermissionsService, PermissionsGuard, JwtAuthGuard, CombinedAuthGuard],
})
export class AuthModule { }
