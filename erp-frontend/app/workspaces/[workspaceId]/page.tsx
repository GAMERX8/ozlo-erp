import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { PaymentToast } from "@/components/billing/payment-toast";
import { Onboarding } from "@/components/subscription/onboarding";
import { APP_NAME } from "@/lib/config";
import { getWorkspaceBillingStatus } from "@/lib/stripe-actions";
import { getDashboardData } from "@/lib/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  LayoutDashboard, 
  ArrowRight, 
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  ShoppingCart
} from "lucide-react";

// Componentes de dashboard
import { KPICard, SalesKPICard, PendingOrdersKPICard, AverageTicketKPICard, DeliveryRateKPICard } from "@/components/dashboard/metrics/kpi-card";
import { SalesChart } from "@/components/dashboard/charts/sales-chart";
import { OrdersByStatusChart } from "@/components/dashboard/charts/orders-by-status";

import { orderStatusLabels, orderStatusBadgeVariants } from "@/types/order";

interface DashboardWorkspacePageProps {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{ payment?: string }>;
}

export async function generateMetadata({ params }: DashboardWorkspacePageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    
    return {
        title: workspaceResult.data ? `${workspaceResult.data.name} | Dashboard` : `Dashboard | ${APP_NAME}`,
    };
}

export default async function DashboardWorkspacePage({ params, searchParams }: DashboardWorkspacePageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const { payment } = await searchParams;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) return null;
    
    const workspace = workspaceResult.data;
    const billingStatus = await getWorkspaceBillingStatus(workspace.id);
    const isPlanActive = billingStatus.success && billingStatus.data?.isActive;

    // Si no tiene plan activo, mostrar onboarding de suscripción
    if (!isPlanActive) {
        return (
            <div className="flex flex-col animate-in fade-in duration-500 gap-6">
                <Onboarding 
                    workspaceId={workspace.id}
                    workspaceSlug={workspace.slug}
                    userEmail={session.user.email ?? ""}
                />
            </div>
        );
    }

    // Obtener datos del dashboard
    const dashboardData = await getDashboardData(workspace.id);
    const data = dashboardData.success ? dashboardData.data : null;

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            <PaymentToast paymentStatus={payment} />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Resumen de {workspace.name} · <Calendar className="inline size-3" /> {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/workspaces/${workspace.slug}/analytics`}>
                            <TrendingUp className="mr-2 size-4" />
                            Ver análisis completo
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SalesKPICard
                    amount={data?.kpis.dailySales.amount || 0}
                    change={data?.kpis.dailySales.change || 0}
                    orders={data?.kpis.dailySales.orders || 0}
                />
                <PendingOrdersKPICard
                    count={data?.kpis.pendingOrders.count || 0}
                    urgent={data?.kpis.pendingOrders.urgent || 0}
                />
                <AverageTicketKPICard
                    amount={data?.kpis.averageTicket.amount || 0}
                    change={data?.kpis.averageTicket.change || 0}
                />
                <DeliveryRateKPICard
                    rate={data?.kpis.deliveryRate.rate || 0}
                    change={data?.kpis.deliveryRate.change || 0}
                />
            </div>

            {/* Gráficos principales */}
            <div className="grid gap-4 lg:grid-cols-7">
                <SalesChart
                    data={data?.salesOverTime || []}
                    className="lg:col-span-4"
                />
                <OrdersByStatusChart
                    data={data?.ordersByStatus || []}
                    className="lg:col-span-3"
                />
            </div>

            {/* Tablas y alertas */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Top 5 productos */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="size-5 text-primary" />
                            Top 5 productos vendidos
                        </CardTitle>
                        <CardDescription>Últimos 7 días</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            {data?.topProducts.slice(0, 5).map((product, index) => (
                                <div key={product.id} className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.sku || "Sin SKU"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-sm">{product.sold_quantity} ud.</p>
                                        <p className="text-xs text-muted-foreground">
                                            S/ {product.total_revenue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {(!data?.topProducts || data.topProducts.length === 0) && (
                                <div className="text-center py-8">
                                    <Package className="mx-auto size-8 text-muted-foreground opacity-50" />
                                    <p className="text-sm text-muted-foreground mt-2">No hay datos disponibles</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Órdenes recientes */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5 text-primary" />
                            Órdenes recientes
                        </CardTitle>
                        <CardDescription>Últimas 5 órdenes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3">
                            {data?.recentOrders.map((order) => (
                                <Link 
                                    key={order.id} 
                                    href={`/workspaces/${workspace.slug}/sales/${order.id}`}
                                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-sm">{order.order_number}</p>
                                            <Badge variant={orderStatusBadgeVariants[order.status]} className="text-[10px]">
                                                {orderStatusLabels[order.status]}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{order.client_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-sm">
                                            S/ {order.total_amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(order.created_at).toLocaleDateString("es-PE")}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                            {(!data?.recentOrders || data.recentOrders.length === 0) && (
                                <div className="text-center py-8">
                                    <ShoppingCart className="mx-auto size-8 text-muted-foreground opacity-50" />
                                    <p className="text-sm text-muted-foreground mt-2">No hay órdenes recientes</p>
                                </div>
                            )}
                        </div>
                        <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
                            <Link href={`/workspaces/${workspace.slug}/sales`}>
                                Ver todas las órdenes
                                <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* Alertas de stock bajo */}
                <Card className="lg:col-span-1 border-amber-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="size-5" />
                            Alertas de stock bajo
                        </CardTitle>
                        <CardDescription>Productos que requieren atención</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3">
                            {data?.lowStockAlerts.map((product) => (
                                <div 
                                    key={product.id} 
                                    className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-3"
                                >
                                    <Package className="size-4 text-amber-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.sku || "Sin SKU"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-amber-600">{product.current_stock}</p>
                                    </div>
                                </div>
                            ))}
                            {(!data?.lowStockAlerts || data.lowStockAlerts.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                                        <Package className="size-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-medium text-emerald-600">¡Todo bien!</p>
                                    <p className="text-xs text-muted-foreground">No hay alertas de stock</p>
                                </div>
                            )}
                        </div>
                        {data?.lowStockAlerts && data.lowStockAlerts.length > 0 && (
                            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                                <Link href={`/workspaces/${workspace.slug}/inventory`}>
                                    Gestionar inventario
                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Card de bienvenida para nuevos usuarios */}
            {!data && (
                <Card className="border-2 border-dashed">
                    <CardHeader>
                        <CardTitle>Comienza a construir tu ERP</CardTitle>
                        <CardDescription>
                            Esta es tu base genérica. Puedes empezar a añadir módulos comerciales aquí.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <LayoutDashboard className="size-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Personaliza este tablero para mostrar métricas de ventas, inventario o cualquier dato relevante para tu negocio.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
