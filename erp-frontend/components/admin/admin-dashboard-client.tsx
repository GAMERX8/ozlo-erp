"use client";

import { useEffect, useState } from "react";
import { getAdminDashboardStats, getAdminActivePlans, type DashboardStats, type AdminPlan } from "@/lib/admin-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Box, CreditCard, TrendingUp, LayoutDashboard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersChart } from "./users-chart";
import { SubscriptionsChart } from "./subscriptions-chart";

// Valores por defecto para evitar errores cuando los datos no están disponibles
const defaultStats: DashboardStats = {
    overview: {
        totalUsers: 0,
        totalWorkspaces: 0,
        activeWorkspaces: 0,
        conversionRate: "0",
    },
    recentUsers: [],
    recentWorkspaces: [],
    revenue: [],
};

interface AdminDashboardClientProps {
    initialStats?: DashboardStats;
}

export function AdminDashboardClient({ initialStats }: AdminDashboardClientProps) {
    const [stats, setStats] = useState<DashboardStats>(initialStats || defaultStats);
    const [loading, setLoading] = useState(!initialStats);
    
    // State for subscriptions
    const [subscriptions, setSubscriptions] = useState<AdminPlan[]>([]);
    const [loadingExtras, setLoadingExtras] = useState(true);

    useEffect(() => {
        // Cargar datos de suscripciones siempre
        loadExtras();
        
        // Si no hay initialStats, cargar también stats
        if (!initialStats) {
            loadStats();
        }

        const interval = setInterval(async () => {
            try {
                await loadExtras();
                const statsResult = await getAdminDashboardStats();
                if (statsResult.success && statsResult.data) setStats(statsResult.data);
            } catch (error) {
                console.error("Error refreshing data:", error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [initialStats]);

    const loadExtras = async () => {
        setLoadingExtras(true);
        try {
            const subsResult = await getAdminActivePlans({ limit: 100 });
            if (subsResult.success && subsResult.data) {
                console.log("Subscriptions loaded:", subsResult.data.plans.length, subsResult.data.plans[0]);
                setSubscriptions(subsResult.data.plans);
            }
        } catch (error) {
            console.error("Error loading extras:", error);
        } finally {
            setLoadingExtras(false);
        }
    };

    const loadStats = async () => {
        setLoading(true);
        try {
            const statsResult = await getAdminDashboardStats();
            if (statsResult.success && statsResult.data) setStats(statsResult.data);
        } catch (error) {
            console.error("Error loading stats:", error);
        } finally {
            setLoading(false);
        }
    };

    // Usar valores por defecto si stats no está definido
    const safeStats = stats || defaultStats;
    const overview = safeStats.overview || defaultStats.overview;

    const statCards = [
        {
            title: "Total Usuarios",
            value: overview.totalUsers,
            description: "Usuarios registrados",
            icon: Users,
            trend: "+12%",
        },
        {
            title: "Workspaces",
            value: overview.totalWorkspaces,
            description: "Workspaces creados",
            icon: Building2,
            trend: "+8%",
        },
        {
            title: "Suscripciones Recientes",
            value: subscriptions.length,
            description: "Workspaces con plan activo",
            icon: CreditCard,
            trend: "+5%",
        },
    ];

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array(4).fill(0).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-3 w-32 mt-2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <LayoutDashboard className="size-8 text-muted-foreground" />
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Visión general de la plataforma
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.title}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {card.title}
                                </CardTitle>
                                <Icon className="size-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {card.description}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                    <TrendingUp className="size-3 text-green-500" />
                                    <span className="text-xs text-green-500">{card.trend}</span>
                                    <span className="text-xs text-muted-foreground">vs mes anterior</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                <UsersChart users={safeStats.recentUsers} isLoading={loading} />
                <SubscriptionsChart subscriptions={subscriptions} isLoading={loadingExtras} />
            </div>
        </div>
    );
}
