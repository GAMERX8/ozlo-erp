import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminPlanById } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    Building2,
    User,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Detalle de Suscripción - Admin - ${APP_NAME}`,
};

interface AdminPlanDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminPlanDetailPage({ params }: AdminPlanDetailPageProps) {
    const { id } = await params;
    
    const planResult = await getAdminPlanById(id);
    
    if (!planResult.success || !planResult.data) {
        notFound();
    }
    
    const workspace = planResult.data as any;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge variant="default">Activo</Badge>;
            case "pending":
                return <Badge variant="secondary">Pendiente</Badge>;
            case "past_due":
                return <Badge variant="destructive">Pago vencido</Badge>;
            case "canceled":
                return <Badge variant="outline">Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPlanBadge = (plan: string) => {
        // Variantes de badge basadas en el tipo de plan
        const planVariants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
            free: { variant: "outline", label: "Free" },
        };
        
        const config = planVariants[plan.toLowerCase()];
        if (config) {
            return <Badge variant={config.variant}>{config.label}</Badge>;
        }
        
        // Para planes de pago, usar variantes cíclicas basadas en el slug
        const paidPlanVariants: ("default" | "secondary" | "outline")[] = ["default", "secondary"];
        const planHash = plan.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const variantIndex = planHash % paidPlanVariants.length;
        
        return (
            <Badge variant={paidPlanVariants[variantIndex]} className="capitalize">
                {plan}
            </Badge>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/plans">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Detalles del Plan</h2>
                    <p className="text-muted-foreground">
                        Información del workspace y su suscripción
                    </p>
                </div>
            </div>

            {/* Workspace Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="size-5" />
                        Workspace {getStatusBadge(workspace.status)}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <span className="text-muted-foreground">Nombre:</span>
                            <p className="font-medium">{workspace.name}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Slug:</span>
                            <p className="font-mono text-xs">{workspace.slug}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Plan:</span>
                            <div className="mt-1">{getPlanBadge(workspace.plan)}</div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Creado:</span>
                            <p>{new Date(workspace.date_created).toLocaleString('es-ES')}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Owner Info */}
                    <div className="flex flex-col gap-2">
                        <h4 className="font-medium flex items-center gap-2">
                            <User className="size-4" />
                            Propietario
                        </h4>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Email:</span>
                            <Button variant="link" className="p-0 h-auto" asChild>
                                <Link href={`/admin/users/${workspace.owner.id}`}>
                                    {workspace.owner.email}
                                </Link>
                            </Button>
                        </div>
                        {workspace.owner.first_name && (
                            <p className="text-sm">
                                <span className="text-muted-foreground">Nombre:</span>{" "}
                                {workspace.owner.first_name} {workspace.owner.last_name}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Subscription Info */}
            {(workspace.stripe_subscription_id || workspace.current_period_end) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="size-5" />
                            Suscripción Stripe
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            {workspace.stripe_subscription_id && (
                                <div>
                                    <span className="text-muted-foreground">Stripe Subscription ID:</span>
                                    <p className="font-mono text-xs">{workspace.stripe_subscription_id}</p>
                                </div>
                            )}
                            {workspace.stripe_price_id && (
                                <div>
                                    <span className="text-muted-foreground">Stripe Price ID:</span>
                                    <p className="font-mono text-xs">{workspace.stripe_price_id}</p>
                                </div>
                            )}
                        </div>

                        {(workspace.current_period_start || workspace.current_period_end) && (
                            <>
                                <Separator />
                                <div className="flex flex-col gap-2">
                                    <h4 className="font-medium flex items-center gap-2">
                                        <Calendar className="size-4" />
                                        Período de Facturación
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                                        {workspace.current_period_start && (
                                            <div>
                                                <span className="text-muted-foreground">Inicio:</span>
                                                <p>{new Date(workspace.current_period_start).toLocaleString('es-ES')}</p>
                                            </div>
                                        )}
                                        {workspace.current_period_end && (
                                            <div>
                                                <span className="text-muted-foreground">Fin:</span>
                                                <p>{new Date(workspace.current_period_end).toLocaleString('es-ES')}</p>
                                            </div>
                                        )}
                                    </div>
                                    {workspace.cancel_at_period_end && (
                                        <Badge variant="destructive" className="mt-2">
                                            Cancela al final del período
                                        </Badge>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            
        </div>
    );
}
