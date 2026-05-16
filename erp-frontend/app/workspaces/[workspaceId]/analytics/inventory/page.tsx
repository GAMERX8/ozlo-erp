import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { APP_NAME } from "@/lib/config";
import { getInventoryAnalytics } from "@/lib/dashboard-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
    ArrowLeft, 
    Warehouse, 
    Package,
    AlertTriangle,
    TrendingUp,
    ArrowDownLeft,
    ArrowUpRight,
    RotateCcw,
    Box,
    ArrowLeftRight
} from "lucide-react";
import { StockDistributionChart } from "@/components/analytics/stock-distribution-chart";

interface InventoryAnalyticsPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: InventoryAnalyticsPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    
    return {
        title: workspaceResult.data ? `Análisis de Inventario | ${workspaceResult.data.name}` : `Análisis de Inventario | ${APP_NAME}`,
    };
}

export default async function InventoryAnalyticsPage({ params }: InventoryAnalyticsPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) return null;
    
    const workspace = workspaceResult.data;
    
    const analyticsResult = await getInventoryAnalytics(workspace.id);
    const data = analyticsResult.success ? analyticsResult.data : null;

    const stockDistributionColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

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
                        <span>Inventario</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Análisis de Inventario
                    </h1>
                    <p className="text-muted-foreground">
                        Gestión y control de stock en tiempo real
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
                        <Link href={`/workspaces/${workspace.slug}/inventory`}>
                            <Package className="mr-2 size-4" />
                            Gestionar inventario
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs principales */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Valor total del inventario
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Warehouse className="size-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            S/ {data?.totalValue.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || "0.00"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data?.totalProducts} productos · {data?.totalVariants} variantes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Productos con stock bajo
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <AlertTriangle className="size-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {data?.lowStockCount || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            requieren reposición
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Rotación de inventario
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <RotateCcw className="size-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.turnover.rate.toFixed(1) || "0.0"}x
                        </div>
                        <p className={`text-xs mt-1 ${data?.turnover.change && data.turnover.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data?.turnover.change && data.turnover.change >= 0 ? "+" : ""}
                            {data?.turnover.change || 0} vs mes anterior
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total de productos
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Box className="size-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.totalProducts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data?.totalVariants} variantes
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Distribución de stock y alertas */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Gráfico de distribución */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Distribución por categoría</CardTitle>
                        <CardDescription>Valor del inventario por categoría</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <StockDistributionChart 
                                data={data?.stockDistribution || []} 
                                colors={stockDistributionColors} 
                            />
                        </div>
                        <div className="mt-4 space-y-2">
                            {data?.stockDistribution.map((cat, index) => (
                                <div key={cat.category} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="size-3 rounded-full"
                                            style={{ backgroundColor: stockDistributionColors[index % stockDistributionColors.length] }}
                                        />
                                        <span>{cat.category}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        S/ {cat.value.toLocaleString("es-PE")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Alertas de stock bajo */}
                <Card className="lg:col-span-2 border-amber-500/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="size-5" />
                            Alertas de stock bajo
                        </CardTitle>
                        <CardDescription>
                            Productos que están por debajo del stock mínimo recomendado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-sm">Producto</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">SKU</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Almacén</th>
                                        <th className="text-center py-3 px-4 font-medium text-sm">Stock actual</th>
                                        <th className="text-center py-3 px-4 font-medium text-sm">Stock mínimo</th>
                                        <th className="text-center py-3 px-4 font-medium text-sm">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.lowStockProducts.map((product) => (
                                        <tr key={product.id} className="border-b last:border-0 hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
                                            <td className="py-3 px-4 font-medium">{product.name}</td>
                                            <td className="py-3 px-4 text-muted-foreground">{product.sku || "-"}</td>
                                            <td className="py-3 px-4 text-muted-foreground">{product.warehouse_name || "-"}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="font-bold text-red-600">{product.current_stock}</span>
                                            </td>
                                            <td className="py-3 px-4 text-center text-muted-foreground">{product.min_stock}</td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge 
                                                    variant={product.current_stock === 0 ? "destructive" : "secondary"}
                                                    className={product.current_stock === 0 ? "" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}
                                                >
                                                    {product.current_stock === 0 ? "Agotado" : "Bajo stock"}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!data?.lowStockProducts || data.lowStockProducts.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                                                        <Package className="size-6 text-emerald-600" />
                                                    </div>
                                                    <p className="font-medium text-emerald-600">¡Excelente!</p>
                                                    <p className="text-sm text-muted-foreground">No hay productos con stock bajo</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Movimientos recientes */}
            <Card>
                <CardHeader>
                    <CardTitle>Movimientos recientes</CardTitle>
                    <CardDescription>Últimos movimientos de entrada, salida y ajustes de inventario</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-sm">Fecha</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm">Producto</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm">Tipo</th>
                                    <th className="text-right py-3 px-4 font-medium text-sm">Cantidad</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm">Motivo</th>
                                    <th className="text-left py-3 px-4 font-medium text-sm">Usuario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.recentMovements.map((movement) => (
                                    <tr key={movement.id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3 px-4 text-muted-foreground text-sm">
                                            {new Date(movement.created_at).toLocaleDateString("es-PE", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-sm">{movement.product_name}</p>
                                                <p className="text-xs text-muted-foreground">{movement.sku || "-"}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge 
                                                variant="outline" 
                                                className={
                                                    movement.type === "in" 
                                                        ? "border-emerald-500 text-emerald-600" 
                                                        : movement.type === "out"
                                                        ? "border-blue-500 text-blue-600"
                                                        : "border-amber-500 text-amber-600"
                                                }
                                            >
                                                {movement.type === "in" && <ArrowDownLeft className="mr-1 size-3" />}
                                                {movement.type === "out" && <ArrowUpRight className="mr-1 size-3" />}
                                                {movement.type === "adjustment" && <TrendingUp className="mr-1 size-3" />}
                                                {movement.type === "in" ? "Entrada" : movement.type === "out" ? "Salida" : "Ajuste"}
                                            </Badge>
                                        </td>
                                        <td className={`py-3 px-4 text-right font-medium ${
                                            movement.quantity > 0 ? "text-emerald-600" : "text-red-600"
                                        }`}>
                                            {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground text-sm">{movement.reason || "-"}</td>
                                        <td className="py-3 px-4 text-muted-foreground text-sm">{movement.created_by}</td>
                                    </tr>
                                ))}
                                {(!data?.recentMovements || data.recentMovements.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <ArrowLeftRight className="mx-auto size-12 text-muted-foreground opacity-50" />
                                            <h3 className="mt-4 text-lg font-medium">Sin movimientos</h3>
                                            <p className="text-sm text-muted-foreground mt-1">No hay movimientos recientes.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
