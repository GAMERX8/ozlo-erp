"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    Loader2,
    CreditCard,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import {
    getWorkspaceBillingStatus,
    createBillingPortalSession,
    cancelWorkspaceSubscription,
    reactivateWorkspaceSubscription,
    removeExtraSubscription,
    reactivateExtraSubscription
} from "@/lib/stripe-actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreditRechargeModal } from "./credit-recharge-modal";
import { Coins } from "lucide-react";

interface BillingStatus {
    plan: string;
    planStatus: string;
    isActive: boolean;
    isPastDue?: boolean;
    isPendingCancellation?: boolean;
    cancelAtPeriodEnd?: boolean;
    cancellationDate?: string | null;
    creditBalance: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    limits: {
        name: string;
        features: any;
    } | null;
}

interface WorkspaceBillingStatusProps {
    workspaceId: string;
    workspaceSlug: string;
}

export function WorkspaceBillingStatus({
    workspaceId,
    workspaceSlug
}: WorkspaceBillingStatusProps) {
    const router = useRouter();
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [isCancelLoading, setIsCancelLoading] = useState(false);
    const [isReactivateLoading, setIsReactivateLoading] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

    const loadBillingStatus = useCallback(async () => {
        const result = await getWorkspaceBillingStatus(workspaceId);
        if (result.success && result.data) {
            setStatus(result.data);
        }
        setIsLoading(false);
    }, [workspaceId]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void loadBillingStatus();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [loadBillingStatus]);

    const handleOpenPortal = async () => {
        setIsPortalLoading(true);
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
        const returnUrl = `${appUrl}/workspaces/${workspaceSlug}/settings`;

        const result = await createBillingPortalSession({
            workspaceId,
            returnUrl,
        });

        if (result.error) {
            toast.error(result.error);
        } else if (result.portalUrl) {
            window.location.href = result.portalUrl;
        }
        setIsPortalLoading(false);
    };

    const handleCancelSubscription = async () => {
        setIsCancelLoading(true);
        const result = await cancelWorkspaceSubscription(workspaceId);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Suscripción cancelada. Seguirás teniendo acceso hasta el final del período.");
            loadBillingStatus();
        }
        setIsCancelLoading(false);
        setIsCancelDialogOpen(false);
    };

    const handleReactivateSubscription = async () => {
        setIsReactivateLoading(true);
        const result = await reactivateWorkspaceSubscription(workspaceId);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Suscripción reactivada correctamente");
            loadBillingStatus();
        }
        setIsReactivateLoading(false);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="size-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (!status) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
                    <p className="text-muted-foreground">Error al cargar el estado de billing</p>
                </CardContent>
            </Card>
        );
    }

    const isPending = status.planStatus === "pending";
    const isCanceled = status.planStatus === "canceled";
    const isPastDue = status.planStatus === "past_due";

    return (
        <div className="flex flex-col gap-6">
            {/* Estado del Plan */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold capitalize">{status.plan}</span>
                                <StatusBadge status={status.planStatus} />
                            </div>
                            {status.currentPeriodStart && status.currentPeriodEnd && status.plan !== "free" && (
                                <div className="text-sm text-muted-foreground mt-1">
                                    {status.isPendingCancellation ? (
                                        <>Su suscripción será cancelada el {new Date(status.cancellationDate || status.currentPeriodEnd).toLocaleDateString("es-ES", {
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })}</>
                                    ) : (
                                        <>Período de facturación: {new Date(status.currentPeriodStart).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })} – {new Date(status.currentPeriodEnd).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}</>
                                    )}
                                </div>
                            )}

                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = `/upgrade/${workspaceSlug}`}
                            >
                                Cambiar plan
                            </Button>
                            {status.isPendingCancellation && (
                                <Button
                                    variant="outline"
                                    className="text-primary"
                                    onClick={handleReactivateSubscription}
                                    disabled={isReactivateLoading}
                                >
                                    {isReactivateLoading ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="size-4 mr-2" />
                                            Reactivar
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Estados especiales */}
                    {isPending && (
                        <Alert className="mt-4">
                            <Clock className="size-4" />
                            <AlertTitle>Suscripción Pendiente</AlertTitle>
                            <AlertDescription>
                                Tu workspace está creado pero necesitas activar un plan para comenzar a usarlo.
                            </AlertDescription>
                        </Alert>
                    )}

                    {isPastDue && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="size-4" />
                            <AlertTitle>Pago Fallido</AlertTitle>
                            <AlertDescription>
                                Hubo un problema con tu método de pago. Por favor actualiza tu información.
                            </AlertDescription>
                        </Alert>
                    )}

                    {isCanceled && (
                        <Alert className="mt-4">
                            <XCircle className="size-4" />
                            <AlertTitle>Suscripción Cancelada</AlertTitle>
                            <AlertDescription>
                                Tu suscripción ha sido cancelada. Reactiva tu plan para continuar.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Saldo de Créditos */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Créditos del Sistema</CardTitle>
                    <CardDescription>
                        Saldo disponible para servicios adicionales y pago por uso
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Saldo actual</p>
                            <p className="text-2xl font-bold">${status.creditBalance?.toFixed(2) || "0.00"}</p>
                        </div>
                        <CreditRechargeModal workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
                    </div>
                </CardContent>
            </Card>

            {/* Límites del Plan */}
            {status.limits && (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Límites y Características</CardTitle>
                        <CardDescription>
                            Resumen de las capacidades de tu plan actual
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {status.limits.features && typeof status.limits.features === 'object' && 
                                Object.entries(status.limits.features).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="size-4 text-green-500" />
                                        <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="font-medium">{String(value)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Gestión de Facturación */}
            {status.isActive && status.plan !== "free" && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Gestión de facturación</h3>
                                <p className="text-sm text-muted-foreground">
                                    Acceda a facturas, recibos y configuración de pagos.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleOpenPortal}
                                    disabled={isPortalLoading}
                                >
                                    {isPortalLoading ? (
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                    ) : (
                                        <CreditCard className="size-4 mr-2" />
                                    )}
                                    Gestionar Pago
                                </Button>
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setIsCancelDialogOpen(true)}
                                >
                                    Cancelar Suscripción
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tu plan seguirá activo hasta el final del período de facturación actual. Después de esa fecha, perderás acceso a las funciones del plan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Mantener suscripción</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isCancelLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            Cancelar suscripción
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
        active: {
            variant: "default",
            icon: <CheckCircle2 className="size-3" />,
            label: "Activo",
        },
        pending: {
            variant: "secondary",
            icon: <Clock className="size-3" />,
            label: "Pendiente",
        },
        past_due: {
            variant: "destructive",
            icon: <AlertCircle className="size-3" />,
            label: "Pago Fallido",
        },
        canceled: {
            variant: "outline",
            icon: <XCircle className="size-3" />,
            label: "Cancelado",
        },
    };

    const config = variants[status] || variants.pending;

    return (
        <Badge variant={config.variant} className="flex items-center gap-1.5">
            {config.icon}
            {config.label}
        </Badge>
    );
}
