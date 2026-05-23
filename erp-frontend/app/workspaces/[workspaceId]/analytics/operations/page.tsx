import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { APP_NAME } from "@/lib/config";
import { getOperationsAnalytics } from "@/lib/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
    ArrowLeft,
    Settings,
    Truck,
    Clock,
    RotateCcw,
    Package,
    CheckCircle,
    AlertCircle,
    Timer,
    TrendingDown,
    TrendingUp,
    User
} from "lucide-react";
import { OrdersByStatusChart } from "@/components/dashboard/charts/orders-by-status";
import { orderStatusLabels, orderStatusColors } from "@/types/order";

interface OperationsAnalyticsPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: OperationsAnalyticsPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    return {
        title: workspaceResult.data ? `Análisis de Operaciones | ${workspaceResult.data.name}` : `Análisis de Operaciones | ${APP_NAME}`,
    };
}

export default async function OperationsAnalyticsPage({ params }: OperationsAnalyticsPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) return null;

    const workspace = workspaceResult.data;

    const analyticsResult = await getOperationsAnalytics(workspace.id, { range: "30d" });
    const data = analyticsResult.success ? analyticsResult.data : null;

    // Calcular estadísticas
    const totalOrders = data?.ordersByStatus.reduce((sum, s) => sum + s.count, 0) || 0;
    const activeOrders = data?.ordersByStatus.filter(s =>
        ["pending", "contacted", "confirmed", "preparing", "shipped"].includes(s.status)
    ).reduce((sum, s) => sum + s.count, 0) || 0;
    const completedOrders = data?.ordersByStatus.find(s => (s.status as string) === "delivered")?.count || 0;
    const cancelledOrders = data?.ordersByStatus.filter(s =>
        ["cancelled", "returned"].includes(s.status)
    ).reduce((sum, s) => sum + s.count, 0) || 0;

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Link href={`/workspaces/${workspace.slug}/analytics`} className="hover:text-foreground">
                            Analytics
                        </Link>
                        <span>/</span>
                        <span>Operaciones</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Análisis de Operaciones
                    </h1>
                    <p className="text-muted-foreground">
                        Métricas de procesos, couriers y eficiencia operativa
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/workspaces/${workspace.slug}/analytics`}>
                            <ArrowLeft className="mr-2 size-4" />
                            Volver
                        </Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href={`/workspaces/${workspace.slug}/sales`}>
                            <Package className="mr-2 size-4" />
                            Ver órdenes
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs principales */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Órdenes en pipeline
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Package className="size-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {activeOrders}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            activas actualmente
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Órdenes entregadas
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CheckCircle className="size-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {completedOrders}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}% del total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tasa de devolución
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-orange-500/10">
                            <RotateCcw className="size-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.returnRate.rate.toFixed(1) || "0.0"}%
                        </div>
                        <p className={`text-xs mt-1 ${data?.returnRate.change && data.returnRate.change <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data?.returnRate.change && data.returnRate.change <= 0 ? "" : "+"}
                            {data?.returnRate.change || 0}% vs período anterior
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tiempo promedio total
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Clock className="size-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.floor((data?.pipelineVelocity.avg_total_hours || 0) / 24)}d {Math.floor((data?.pipelineVelocity.avg_total_hours || 0) % 24)}h
                        </div>
                        <p className={`text-xs mt-1 ${data?.pipelineVelocity.change && data.pipelineVelocity.change <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data?.pipelineVelocity.change && data.pipelineVelocity.change <= 0 ? "" : "+"}
                            {data?.pipelineVelocity.change || 0}h vs período anterior
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline y tiempos */}
            <div className="grid gap-4 lg:grid-cols-2">
                <OrdersByStatusChart
                    data={data?.ordersByStatus || []}
                    title="Pipeline de órdenes"
                    description="Distribución actual de órdenes por estado"
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Tiempo promedio por estado</CardTitle>
                        <CardDescription>Tiempo promedio que las órdenes pasan en cada estado</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.averageTimeByStatus.map((item) => (
                                <div key={item.status}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`size-3 rounded-full ${orderStatusColors[item.status]}`} />
                                            <span className="font-medium text-sm">{orderStatusLabels[item.status]}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {Math.floor(item.average_hours)}h {Math.round((item.average_hours % 1) * 60)}m
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${orderStatusColors[item.status]}`}
                                            style={{
                                                width: `${Math.min((item.average_hours / 48) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {item.count} órdenes pasaron por este estado
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rendimiento de couriers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="size-5 text-primary" />
                        Efectividad de couriers
                    </CardTitle>
                    <CardDescription>
                        Rendimiento de los couriers por tasa de entrega y tiempo promedio
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-sm">Courier</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm">Total órdenes</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm">Entregadas</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm">Tasa de entrega</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm">Tiempo promedio</th>
                                    <th className="text-center py-3 px-4 font-medium text-sm">Rendimiento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.courierPerformance.map((courier) => (
                                    <tr key={courier.courier_id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="size-4 text-primary" />
                                                </div>
                                                <span className="font-medium">{courier.courier_name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">{courier.total_orders}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="text-emerald-600 font-medium">{courier.delivered_orders}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Progress
                                                    value={courier.delivery_rate}
                                                    className="w-20 h-2"
                                                />
                                                <span className={`text-sm font-medium ${courier.delivery_rate >= 95 ? "text-emerald-600" :
                                                        courier.delivery_rate >= 90 ? "text-blue-600" :
                                                            courier.delivery_rate >= 80 ? "text-amber-600" : "text-red-600"
                                                    }`}>
                                                    {courier.delivery_rate.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-muted-foreground">
                                            {Math.floor(courier.average_delivery_hours)}h
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    courier.delivery_rate >= 95 ? "border-emerald-500 text-emerald-600" :
                                                        courier.delivery_rate >= 90 ? "border-blue-500 text-blue-600" :
                                                            courier.delivery_rate >= 80 ? "border-amber-500 text-amber-600" : "border-red-500 text-red-600"
                                                }
                                            >
                                                {courier.delivery_rate >= 95 ? "Excelente" :
                                                    courier.delivery_rate >= 90 ? "Bueno" :
                                                        courier.delivery_rate >= 80 ? "Regular" : "Necesita mejora"}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.courierPerformance || data.courierPerformance.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <Truck className="mx-auto size-12 text-muted-foreground opacity-50" />
                                            <h3 className="mt-4 text-lg font-medium">Sin datos</h3>
                                            <p className="text-sm text-muted-foreground mt-1">No hay datos de couriers disponibles.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Resumen de operaciones */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle className="size-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Órdenes exitosas</p>
                                <p className="text-2xl font-bold text-emerald-600">{completedOrders}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-500/20 bg-red-50/30 dark:bg-red-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertCircle className="size-6 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Órdenes problemáticas</p>
                                <p className="text-2xl font-bold text-red-600">{cancelledOrders}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Timer className="size-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">En proceso</p>
                                <p className="text-2xl font-bold text-amber-600">{activeOrders}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
