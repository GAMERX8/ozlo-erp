import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { APP_NAME } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
    ArrowLeft,
    BarChart3, 
    TrendingUp, 
    Package, 
    Settings, 
    ArrowRight,
    DollarSign,
    ShoppingCart,
    Users,
    Truck,
    Warehouse
} from "lucide-react";

interface AnalyticsPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    
    return {
        title: workspaceResult.data ? `Análisis | ${workspaceResult.data.name}` : `Análisis | ${APP_NAME}`,
    };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) return null;
    
    const workspace = workspaceResult.data;

    const analyticsSections = [
        {
            id: "sales",
            title: "Ventas",
            description: "Análisis detallado de ventas, ingresos y comportamiento de compra",
            icon: DollarSign,
            color: "text-emerald-600",
            bgColor: "bg-emerald-500/10",
            href: `/workspaces/${workspace.slug}/analytics/sales`,
            metrics: ["Ingresos totales", "Ventas por canal", "Productos más vendidos", "Tendencias"],
        },
        {
            id: "inventory",
            title: "Inventario",
            description: "Gestión y análisis de stock, movimientos y rotación de productos",
            icon: Warehouse,
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
            href: `/workspaces/${workspace.slug}/analytics/inventory`,
            metrics: ["Valor del inventario", "Stock bajo", "Rotación", "Movimientos"],
        },
        {
            id: "operations",
            title: "Operaciones",
            description: "Métricas de procesos, couriers y eficiencia operativa",
            icon: Truck,
            color: "text-purple-600",
            bgColor: "bg-purple-500/10",
            href: `/workspaces/${workspace.slug}/analytics/operations`,
            metrics: ["Pipeline de órdenes", "Tiempos de entrega", "Efectividad de couriers", "Devoluciones"],
        },
    ];

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Analytics
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Análisis completo de {workspace.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" asChild><Link href={`/workspaces/${workspace.slug}`}><ArrowLeft className="h-4 w-4" /></Link></Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {analyticsSections.map((section) => (
                    <Link key={section.id} href={section.href}>
                        <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/20 group">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`p-2 rounded-lg ${section.bgColor} ${section.color}`}>
                                        <section.icon className="size-6" />
                                    </div>
                                    <ArrowRight className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <CardTitle className="text-xl mt-2">{section.title}</CardTitle>
                                <CardDescription>{section.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {section.metrics.map((metric) => (
                                        <Badge key={metric} variant="secondary" className="text-xs">
                                            {metric}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="size-5 text-primary" />
                        Resumen rápido
                    </CardTitle>
                    <CardDescription>
                        Métricas clave de los últimos 30 días
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Ventas totales</p>
                            <p className="text-2xl font-bold mt-1">S/ 485,320</p>
                            <p className="text-xs text-emerald-600 mt-1">+15.3% vs mes anterior</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Órdenes completadas</p>
                            <p className="text-2xl font-bold mt-1">486</p>
                            <p className="text-xs text-emerald-600 mt-1">+8.2% vs mes anterior</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Valor del inventario</p>
                            <p className="text-2xl font-bold mt-1">S/ 1,250,000</p>
                            <p className="text-xs text-blue-600 mt-1">Rotación: 4.5x</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Tasa de entrega</p>
                            <p className="text-2xl font-bold mt-1">94.5%</p>
                            <p className="text-xs text-emerald-600 mt-1">+2.1% vs mes anterior</p>
                        </CardContent></Card>
                    </div>
                </CardContent>
            </Card>

            {/* Navigation Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle>Explorar análisis detallado</CardTitle>
                    <CardDescription>
                        Selecciona una categoría para ver métricas detalladas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="sales" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="sales" asChild>
                                <Link href={`/workspaces/${workspace.slug}/analytics/sales`}>
                                    <DollarSign className="mr-2 size-4" />
                                    Ventas
                                </Link>
                            </TabsTrigger>
                            <TabsTrigger value="inventory" asChild>
                                <Link href={`/workspaces/${workspace.slug}/analytics/inventory`}>
                                    <Package className="mr-2 size-4" />
                                    Inventario
                                </Link>
                            </TabsTrigger>
                            <TabsTrigger value="operations" asChild>
                                <Link href={`/workspaces/${workspace.slug}/analytics/operations`}>
                                    <Truck className="mr-2 size-4" />
                                    Operaciones
                                </Link>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="sales" className="mt-6">
                            <div className="text-center py-8">
                                <TrendingUp className="mx-auto size-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium">Análisis de Ventas</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                                    Explora métricas detalladas de ventas por canal, región, productos y tendencias temporales.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={`/workspaces/${workspace.slug}/analytics/sales`}>
                                        Ver análisis de ventas
                                        <ArrowRight className="ml-2 size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="inventory" className="mt-6">
                            <div className="text-center py-8">
                                <Warehouse className="mx-auto size-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium">Análisis de Inventario</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                                    Monitorea el valor de tu inventario, productos con stock bajo, rotación y movimientos recientes.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={`/workspaces/${workspace.slug}/analytics/inventory`}>
                                        Ver análisis de inventario
                                        <ArrowRight className="ml-2 size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="operations" className="mt-6">
                            <div className="text-center py-8">
                                <Settings className="mx-auto size-12 text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium">Análisis de Operaciones</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                                    Analiza el pipeline de órdenes, tiempos de procesamiento, efectividad de couriers y más.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={`/workspaces/${workspace.slug}/analytics/operations`}>
                                        Ver análisis de operaciones
                                        <ArrowRight className="ml-2 size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
