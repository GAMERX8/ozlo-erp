import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    // ==================== DASHBOARD STATISTICS ====================

    async getDashboardStats() {
        const [
            totalUsers,
            totalWorkspaces,
            activeWorkspaces,
            recentUsers,
            recentWorkspaces,
            revenueData,
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.workspace.count(),
            this.prisma.workspace.count({
                where: { status: 'active' },
            }),
            this.prisma.user.findMany({
                take: 5,
                orderBy: { date_created: 'desc' },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                    date_created: true,
                },
            }),
            this.prisma.workspace.findMany({
                take: 5,
                orderBy: { date_created: 'desc' },
                include: {
                    owner: {
                        select: {
                            email: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    _count: {
                        select: {
                            members: true,
                        },
                    },
                },
            }),
            this.getRevenueStats(),
        ]);

        return {
            overview: {
                totalUsers,
                totalWorkspaces,
                activeWorkspaces,
                conversionRate: totalWorkspaces > 0 
                    ? ((activeWorkspaces / totalWorkspaces) * 100).toFixed(2)
                    : '0.00',
            },
            recentUsers,
            recentWorkspaces,
            revenue: revenueData,
        };
    }

    private async getRevenueStats() {
        // Calcular MRR basado en workspaces activos
        const activeWorkspaces = await this.prisma.workspace.findMany({
            where: { status: 'active' },
            select: {
                plan: true,
                date_created: true
            },
        });

        const now = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            return {
                month: date.toLocaleString('es-ES', { month: 'short' }),
                year: date.getFullYear(),
                monthIndex: date.getMonth(),
            };
        }).reverse();

        const monthlyData = last6Months.map(({ month, year, monthIndex }) => {
            const count = activeWorkspaces.filter((ws) => {
                const wsDate = new Date(ws.date_created);
                return wsDate.getMonth() === monthIndex && wsDate.getFullYear() === year;
            }).length;
            return { month, count };
        });

        return monthlyData;
    }

    // ==================== USERS MANAGEMENT ====================

    async getAllUsers(params: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 20, search } = params;
        const skip = (page - 1) * limit;

        const where = search
            ? {
                  OR: [
                      { email: { contains: search, mode: 'insensitive' as const } },
                      { first_name: { contains: search, mode: 'insensitive' as const } },
                      { last_name: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date_created: 'desc' },
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true,
                    role: true,
                    email_verified: true,
                    date_created: true,
                    _count: {
                        select: {
                            workspaces: true,
                            workspaceMembers: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getUserById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                email_verified: true,
                avatar: true,
                date_created: true,
                workspaces: {
                    include: {
                        _count: {
                            select: {
                                members: true,
                            },
                        },
                    },
                },
                workspaceMembers: {
                    include: {
                        workspace: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                owner: {
                                    select: {
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateUserRole(id: string, dto: UpdateUserRoleDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return this.prisma.user.update({
            where: { id },
            data: { role: dto.role },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });
    }

    async deleteUser(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Eliminar primero los workspaces donde es owner (con todas sus dependencias)
        const workspaces = await this.prisma.workspace.findMany({
            where: { owner_id: id },
            select: { id: true },
        });

        for (const workspace of workspaces) {
            // Eliminar miembros e invitaciones del workspace
            await this.prisma.workspaceMember.deleteMany({
                where: { workspace_id: workspace.id },
            });
            await this.prisma.workspaceInvitation.deleteMany({
                where: { workspace_id: workspace.id },
            });

            // Eliminar el workspace
            await this.prisma.workspace.delete({
                where: { id: workspace.id },
            });
        }

        // Limpiar memberships e invitaciones donde el usuario es miembro/invitado
        await this.prisma.workspaceMember.deleteMany({
            where: { user_id: id },
        });
        await this.prisma.workspaceInvitation.deleteMany({
            where: { OR: [{ invited_user_id: id }, { invited_by: id }] },
        });

        // Eliminar MFA si existe
        await this.prisma.mfaSecret.deleteMany({
            where: { user_id: id },
        });

        // Eliminar password resets
        await this.prisma.passwordReset.deleteMany({
            where: { user_id: id },
        });

        // Finalmente eliminar el usuario
        await this.prisma.user.delete({
            where: { id },
        });

        return { message: 'User deleted successfully' };
    }

    // ==================== WORKSPACES MANAGEMENT ====================

    async getAllWorkspaces(params: { page?: number; limit?: number; search?: string }) {
        const { page = 1, limit = 20, search } = params;
        const skip = (page - 1) * limit;

        const where = search
            ? {
                  OR: [
                      { name: { contains: search, mode: 'insensitive' as const } },
                      { slug: { contains: search, mode: 'insensitive' as const } },
                  ],
              }
            : {};

        const [workspaces, total] = await Promise.all([
            this.prisma.workspace.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date_created: 'desc' },
                include: {
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                    _count: {
                        select: {
                            members: true,
                            invitations: true,
                        },
                    },
                },
            }),
            this.prisma.workspace.count({ where }),
        ]);

        return {
            data: workspaces,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getWorkspaceById(id: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                first_name: true,
                                last_name: true,
                            },
                        },
                    },
                },
                invitations: {
                    include: {
                        invited_user: {
                            select: {
                                id: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        return workspace;
    }

    async deleteWorkspace(id: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id }
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        // Eliminar miembros e invitaciones
        await this.prisma.workspaceMember.deleteMany({
            where: { workspace_id: id },
        });
        await this.prisma.workspaceInvitation.deleteMany({
            where: { workspace_id: id },
        });

        await this.prisma.workspace.delete({
            where: { id },
        });

        return { message: 'Workspace deleted successfully' };
    }

    // ==================== PLANS & BILLING MANAGEMENT ====================

    async getAllPlans() {
        return this.prisma.plan.findMany({
            orderBy: { price: 'asc' },
        });
    }

    async createPlan(data: any) {
        return this.prisma.plan.create({
            data: {
                ...data,
                features: data.features || [],
            },
        });
    }

    async updatePlan(id: string, data: any) {
        const plan = await this.prisma.plan.findFirst({
            where: {
                OR: [
                    { id },
                    { slug: id }
                ]
            }
        });
        if (!plan) throw new NotFoundException('Plan not found');
        return this.prisma.plan.update({
            where: { id: plan.id },
            data,
        });
    }

    async deletePlan(id: string) {
        const plan = await this.prisma.plan.findFirst({
            where: {
                OR: [
                    { id },
                    { slug: id }
                ]
            }
        });
        if (!plan) throw new NotFoundException('Plan not found');
        if (plan.is_system) throw new ForbiddenException('Cannot delete system plan');
        return this.prisma.plan.delete({
            where: { id: plan.id },
        });
    }

    async getAllActivePlans(params: { page?: number; limit?: number; status?: string }) {
        const { page = 1, limit = 20, status } = params;
        const skip = (page - 1) * limit;

        const where: any = { status: status || 'active' };

        const [workspaces, total] = await Promise.all([
            this.prisma.workspace.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date_created: 'desc' },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    plan: true,
                    status: true,
                    current_subscription: {
                        select: {
                            stripe_subscription_id: true,
                            current_period_start: true,
                            current_period_end: true,
                            cancel_at_period_end: true,
                        }
                    },
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            first_name: true,
                            last_name: true,
                        },
                    }
                },
            }),
            this.prisma.workspace.count({ where }),
        ]);

        return {
            data: workspaces,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getPlanById(id: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                status: true,
                stripe_customer_id: true,
                current_subscription: {
                    select: {
                        stripe_subscription_id: true,
                        stripe_price_id: true,
                        current_period_start: true,
                        current_period_end: true,
                        cancel_at_period_end: true,
                    }
                },
                date_created: true,
                owner: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                    },
                }
            },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        return workspace;
    }

    async updatePlanStatus(id: string, status: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id },
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        return this.prisma.workspace.update({
            where: { id },
            data: { status: status },
        });
    }

    
}
