import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InitService implements OnModuleInit {
    private readonly logger = new Logger(InitService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly workspacesService: WorkspacesService,
    ) {}

    async onModuleInit() {
        await this.createFirstAdmin();
    }

    private async createFirstAdmin() {
        try {
            // Verificar si ya existe algún usuario
            const userCount = await this.prisma.user.count();

            if (userCount > 0) {
                this.logger.log('Users already exist, skipping first admin creation');
                return;
            }

            // Obtener credenciales del .env
            const email = this.configService.get<string>('FIRST_ADMIN_EMAIL');
            const password = this.configService.get<string>('FIRST_ADMIN_PASSWORD');
            const firstName = this.configService.get<string>('FIRST_ADMIN_FIRST_NAME') || 'Admin';
            const lastName = this.configService.get<string>('FIRST_ADMIN_LAST_NAME') || 'User';

            if (!email || !password) {
                this.logger.warn('FIRST_ADMIN_EMAIL or FIRST_ADMIN_PASSWORD not set in .env');
                this.logger.warn('Skipping first admin creation');
                return;
            }

            // Verificar que la contraseña sea segura (mínimo 6 caracteres)
            if (password.length < 6) {
                this.logger.error('FIRST_ADMIN_PASSWORD must be at least 6 characters');
                return;
            }

            // Hashear contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Crear usuario admin
            const admin = await this.prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    first_name: firstName,
                    last_name: lastName,
                    role: 'super_admin',
                    email_verified: true, // Auto-verificado
                },
            });

            // Crear workspace por defecto para el admin
            const workspaceName = `${firstName}'s Workspace`;
            const workspace = await this.workspacesService.create(admin.id, {
                name: workspaceName,
            });

            this.logger.log('╔════════════════════════════════════════════════╗');
            this.logger.log('║  🎉 FIRST ADMIN USER CREATED SUCCESSFULLY      ║');
            this.logger.log('╠════════════════════════════════════════════════╣');
            this.logger.log(`║  Email:    ${email.padEnd(36)} ║`);
            this.logger.log(`║  Role:     super_admin${' '.repeat(21)} ║`);
            this.logger.log(`║  Name:     ${(firstName + ' ' + lastName).padEnd(36)} ║`);
            this.logger.log('╠════════════════════════════════════════════════╣');
            this.logger.log('║  📁 DEFAULT WORKSPACE CREATED                  ║');
            this.logger.log(`║  Workspace: ${workspace.name.padEnd(35)} ║`);
            this.logger.log(`║  Slug:     ${workspace.slug.padEnd(36)} ║`);
            this.logger.log('╚════════════════════════════════════════════════╝');
            this.logger.warn('⚠️  IMPORTANT: Change the default password after first login!');

        } catch (error) {
            this.logger.error('Failed to create first admin user:', error.message);
        }
    }
}
