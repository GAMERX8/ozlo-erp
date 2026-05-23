import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { APP_NAME } from "@/lib/config";
import { getSalesAnalytics } from "@/lib/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { 
    ArrowLeft, 
    DollarSign, 
    TrendingUp, 
    ShoppingBag,
    Facebook,
    MessageCircle,
    Instagram,
    Video,
    Globe,
    MapPin,
    Package
} from "lucide-react";
import { SalesChart } from "@/components/dashboard/charts/sales-chart";
import { salesChannelLabels } from "@/types/order";
import type { SalesChannel, RegionType } from "@/types/order";

interface SalesAnalyticsPageProps {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{ range?: string }>;
}

export async function generateMetadata({ params }: SalesAnalyticsPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    
    return {
        title: workspaceResult.data ? `Análisis de Ventas | ${workspaceResult.data.name}` : `Análisis de Ventas | ${APP_NAME}`,
    };
}

const channelIcons: Record<string, typeof Facebook> = {
    facebook: Facebook,
    whatsapp: MessageCircle,
    instagram: Instagram,
    tiktok: Video,
    other: Globe,
};

const channelColors: Record<string, string> = {
    facebook: "text-blue-600 bg-blue-500/10",
    whatsapp: "text-green-600 bg-green-500/10",
    instagram: "text-pink-600 bg-pink-500/10",
    tiktok: "text-purple-600 bg-purple-500/10",
    other: "text-gray-600 bg-gray-500/10",
};

export default async function SalesAnalyticsPage({ params, searchParams }: SalesAnalyticsPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const { range = "30d" } = await searchParams;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) return null;
    
    const workspace = workspaceResult.data;
    
    const analyticsResult = await getSalesAnalytics(workspace.id, { range: range as "7d" | "30d" | "90d" | "today" | "yesterday" | "custom" });
    const data = analyticsResult.success ? analyticsResult.data : null;

    const dateRanges = [
        { value: "7d", label: "7 días" },
        { value: "30d", label: "30 días" },
        { value: "90d", label: "90 días" },
    ];

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
                        <span>Ventas</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Análisis de Ventas
                    </h1>
                    <p className="text-muted-foreground">
                        Métricas detalladas de ventas y rendimiento
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/workspaces/${workspace.slug}/analytics`}>
                            <ArrowLeft className="mr-2 size-4" />
                            Volver
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Filtros de fecha */}
            <div className="flex justify-end">
                <Tabs defaultValue={range}>
                    <TabsList>
                        {dateRanges.map((r) => (
                            <TabsTrigger key={r.value} value={r.value} asChild>
                                <Link href={`/workspaces/${workspace.slug}/analytics/sales?range=${r.value}`}>
                                    {r.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* KPIs principales */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ventas totales
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <DollarSign className="size-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            S/ {data?.totalSales.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}
                        </div>
                        <p className={`text-xs mt-1 ${data?.totalSales.change && data.totalSales.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data?.totalSales.change && data.totalSales.change >= 0 ? "+" : ""}
                            {data?.totalSales.change || 0}% vs período anterior
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total órdenes
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <ShoppingBag className="size-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.totalSales.orders || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            órdenes completadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Ticket promedio
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <TrendingUp className="size-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            S/ {data?.averageOrderValue.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}
                        </div>
                        <p className={`text-xs mt-1 ${data?.averageOrderValue.change && data.averageOrderValue.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data?.averageOrderValue.change && data.averageOrderValue.change >= 0 ? "+" : ""}
                            {data?.averageOrderValue.change || 0}% vs período anterior
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Productos vendidos
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Package className="size-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.topProducts.reduce((sum, p) => sum + p.sold_quantity, 0) || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            unidades totales
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de ventas en el tiempo */}
            <SalesChart
                data={data?.salesOverTime || []}
                title="Tendencia de ventas"
                description={`Ventas y órdenes durante el período seleccionado`}
                className="w-full"
            />

            {/* Ventas por canal y región */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Ventas por canal</CardTitle>
                        <CardDescription>Distribución de ventas según el canal de origen</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.salesByChannel.map((channel) => {
                                const Icon = channelIcons[channel.channel];
                                return (
                                    <div key={channel.channel} className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${channelColors[channel.channel]}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-medium text-sm">{salesChannelLabels[channel.channel]}</p>
                                                <p className="text-sm font-medium">
                                                    S/ {channel.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary rounded-full"
                                                        style={{ width: `${channel.percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-12 text-right">
                                                    {channel.percentage}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {channel.orders} órdenes
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ventas por región</CardTitle>
                        <CardDescription>Distribución geográfica de las ventas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data?.salesByRegion.map((region) => (
                                <div key={region.region} className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <MapPin className="size-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-sm">
                                                {(region.region as string) === "lima" ? "Lima Metropolitana" : "Provincias"}
                                            </p>
                                            <p className="text-sm font-medium">
                                                S/ {region.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${region.percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-12 text-right">
                                                {region.percentage}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {region.orders} órdenes
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Productos más vendidos */}
            <Card>
                <CardHeader>
                    <CardTitle>Productos más vendidos</CardTitle>
                    <CardDescription>Top productos por cantidad vendida e ingresos generados</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-sm">Producto</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm">SKU</th>
                                    <th className="text-right py-3 px-4 font-medium text-sm">Cantidad vendida</th>
                                    <th className="text-right py-3 px-4 font-medium text-sm">Ingresos</th>
                                    <th className="text-right py-3 px-4 font-medium text-sm">Promedio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.topProducts.map((product) => (
                                    <tr key={product.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3 px-4 font-medium">{product.name}</td>
                                        <td className="py-3 px-4 text-muted-foreground">{product.sku || "-"}</td>
                                        <td className="py-3 px-4 text-right">{product.sold_quantity}</td>
                                        <td className="py-3 px-4 text-right">
                                            S/ {product.total_revenue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right text-muted-foreground">
                                            S/ {(product.total_revenue / product.sold_quantity).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
