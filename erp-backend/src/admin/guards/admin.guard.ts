import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.userId) {
            throw new ForbiddenException('Access denied');
        }

        const dbUser = await this.prisma.user.findUnique({
            where: { id: user.userId },
            select: { role: true },
        });

        if (!dbUser) {
            throw new ForbiddenException('User not found');
        }

        if (dbUser.role !== 'super_admin') {
            throw new ForbiddenException('Super admin access required');
        }

        return true;
    }
}
