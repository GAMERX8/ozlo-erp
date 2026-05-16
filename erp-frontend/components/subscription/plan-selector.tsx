"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, AlertCircle, ArrowUpRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
    createCheckoutSession, 
    upgradePlan, 
    getAvailablePlans,
    getUpgradeInfo,
    createUpgradeCheckout 
} from "@/lib/stripe-actions";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Plan {
    id: string;
    name: string;
    price: number;
    includedInstances: number;
    extraInstancePrice: number;
    features: string[];
    isRecommended?: boolean;
}

interface PlanSelectorProps {
    workspaceId: string;
    workspaceSlug: string;
    currentPlan: string;
    planStatus?: string;
    promoCode?: string | null;
    onSuccess?: () => void;
}

export function PlanSelector({
    workspaceId,
    workspaceSlug,
    currentPlan,
    planStatus,
    promoCode,
    onSuccess,
}: PlanSelectorProps) {
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [upgradeInfo, setUpgradeInfo] = useState<{
        show: boolean;
        planName: string;
        priceDifference: number;
        nextBillingAmount: number;
    } | null>(null);
    
    // Estado para el diálogo de confirmación de upgrade
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        planId: string | null;
        planName: string;
        priceDifference: number;
        newPlanPrice: number;
        currentPlanPrice: number;
        currentPlanName: string;
        isNewSubscription: boolean;
        loading: boolean;
    }>({
        open: false,
        planId: null,
        planName: '',
        priceDifference: 0,
        newPlanPrice: 0,
        currentPlanPrice: 0,
        currentPlanName: '',
        isNewSubscription: false,
        loading: false,
    });
    
    // Verificar si ya tiene una suscripción activa de pago
    const hasActiveSubscription = planStatus === 'active' && currentPlan !== 'free';

    useEffect(() => {
        async function loadPlans() {
            try {
                const result = await getAvailablePlans();
                if (result.success && result.plans) {
                    setPlans(result.plans);
                } else {
                    toast.error(result.error || "Error al cargar los planes");
                }
            } catch (error) {
                toast.error("Error de conexión al cargar los planes");
            } finally {
                setIsLoadingPlans(false);
            }
        }
        loadPlans();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        if (planId === currentPlan) {
            toast.info("Ya estás en este plan");
            onSuccess?.();
            return;
        }

        // Si elige Free (downgrade), procesar directamente
        if (planId === "free") {
            setLoadingPlan(planId);
            try {
                const result = await upgradePlan(workspaceId, "free");
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Plan actualizado a Free");
                    onSuccess?.();
                    router.refresh();
                }
            } catch (err) {
                toast.error("Ocurrió un error al procesar el cambio de plan.");
            }
            setLoadingPlan(null);
            return;
        }

        // Si el plan actual es free, ir directo a Stripe sin confirmación
        if (currentPlan === 'free') {
            setLoadingPlan(planId);
            try {
                const result = await createUpgradeCheckout(workspaceId, planId, promoCode || undefined);
                
                if (result.error) {
                    toast.error(result.error);
                } else if (result.checkoutUrl) {
                    window.location.href = result.checkoutUrl;
                    return;
                }
            } catch (err) {
                toast.error("Error al procesar el upgrade.");
            }
            setLoadingPlan(null);
            return;
        }

        // Obtener información del upgrade para mostrar el diálogo de confirmación
        setLoadingPlan(planId);
        try {
            const info = await getUpgradeInfo(workspaceId, planId);
            if (info.error) {
                toast.error(info.error);
                setLoadingPlan(null);
                return;
            }

            const planName = plans.find(p => p.id === planId)?.name || planId;
            const currentPlanName = plans.find(p => p.id === currentPlan)?.name || (currentPlan === 'free' ? 'Free' : currentPlan);

            // Mostrar diálogo de confirmación
            setConfirmDialog({
                open: true,
                planId,
                planName,
                priceDifference: info.priceDifference,
                newPlanPrice: info.newPlanPrice,
                currentPlanPrice: info.currentPlanPrice,
                currentPlanName,
                isNewSubscription: info.isNewSubscription,
                loading: false,
            });
        } catch (err) {
            toast.error("Error al obtener información del upgrade.");
        }
        setLoadingPlan(null);
    };

    const handleConfirmUpgrade = async () => {
        if (!confirmDialog.planId) return;

        setConfirmDialog(prev => ({ ...prev, loading: true }));

        try {
            // Si es nueva suscripción o requiere pago, crear checkout
            if (confirmDialog.isNewSubscription || confirmDialog.priceDifference > 0) {
                const result = await createUpgradeCheckout(workspaceId, confirmDialog.planId, promoCode || undefined);
                
                if (result.error) {
                    toast.error(result.error);
                    setConfirmDialog(prev => ({ ...prev, loading: false }));
                    return;
                }

                if (result.checkoutUrl) {
                    window.location.href = result.checkoutUrl;
                    return;
                }
            }

            // Si no requiere pago, aplicar directamente
            const result = await upgradePlan(workspaceId, confirmDialog.planId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Plan actualizado a ${confirmDialog.planName}`);
                setConfirmDialog(prev => ({ ...prev, open: false }));
                onSuccess?.();
                router.refresh();
            }
        } catch (err) {
            toast.error("Error al procesar el upgrade.");
        }
        
        setConfirmDialog(prev => ({ ...prev, loading: false }));
    };

    const getButtonLabel = (planId: string, planName: string) => {
        if (planId === currentPlan) return "Plan actual";
        return `Obtener ${planName}`;
    };

    if (isLoadingPlans) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (plans.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
                <CreditCard className="mx-auto size-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No hay planes</h3>
                <p className="text-sm text-muted-foreground mt-1">No hay planes configurados en este momento.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Upgrade Info Alert */}
            {upgradeInfo?.show && (
                <Alert className="max-w-3xl mx-auto">
                    <AlertCircle className="size-4" />
                    <AlertTitle>
                        Upgrade realizado
                    </AlertTitle>
                    <AlertDescription>
                        Tu plan ha sido actualizado a <strong>{upgradeInfo.planName}</strong>.
                        <br />
                        Se te cobrará un extra de <strong>${upgradeInfo.priceDifference}</strong> en tu próxima factura.
                        <br />
                        <span className="text-sm">
                            Monto de próxima factura: ${upgradeInfo.nextBillingAmount}/mes
                        </span>
                    </AlertDescription>
                </Alert>
            )}
            
            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
                {plans.filter(plan => plan.id !== "free").map((plan) => {
                    const isCurrent = currentPlan === plan.id;
                    const isLoading = loadingPlan === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className={`relative p-8 rounded-2xl border flex flex-col ${
                                isCurrent
                                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                                    : "border-border bg-card"
                            }`}
                        >
                            {isCurrent && (
                                <div className="absolute top-4 right-4">
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        Actual
                                    </Badge>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-4">
                                <div className="font-bold text-xl text-foreground">{plan.name}</div>
                                {plan.isRecommended && !isCurrent && (
                                    <Badge variant="secondary" className="text-xs px-3 py-1">Recomendado</Badge>
                                )}
                            </div>
                            
                            <div className="text-4xl font-bold text-foreground mb-2">
                                ${plan.price}
                                <span className="text-lg font-normal text-muted-foreground">/mes</span>
                            </div>
                            
                            <div className="flex flex-col text-base text-muted-foreground mt-4 flex-1 gap-3">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <Check className="size-5 text-primary flex-shrink-0" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Button for each plan */}
                            <Button
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={isLoading || isCurrent}
                                className="w-full mt-6 h-12 text-base"
                                variant={isCurrent ? "secondary" : "default"}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : isCurrent ? (
                                    <>
                                        <Check className="mr-2 size-4" />
                                        Plan actual
                                    </>
                                ) : (
                                    getButtonLabel(plan.id, plan.name)
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Diálogo de Confirmación de Upgrade */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowUpRight className="size-5 text-primary" />
                            Confirmar Upgrade
                        </DialogTitle>
                        <DialogDescription>
                            Estás a punto de cambiar tu plan de suscripción.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col py-4 gap-4">
                        {/* Resumen de cambio */}
                        <div className="flex flex-col bg-muted/50 rounded-lg p-4 gap-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Plan actual:</span>
                                <span className="font-medium">{confirmDialog.currentPlanName} (${confirmDialog.currentPlanPrice}/mes)</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Nuevo plan:</span>
                                <span className="font-medium text-primary">{confirmDialog.planName} (${confirmDialog.newPlanPrice}/mes)</span>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Diferencia a pagar hoy:</span>
                                    <span className="font-medium text-primary">
                                        ${confirmDialog.priceDifference}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Mensaje según el caso */}
                        {confirmDialog.isNewSubscription ? (
                            <Alert>
                                <CreditCard className="size-4" />
                                <AlertTitle>Nueva suscripción</AlertTitle>
                                <AlertDescription>
                                    Se te cobrará <strong>${confirmDialog.newPlanPrice}</strong> por tu primera suscripción.
                                </AlertDescription>
                            </Alert>
                        ) : confirmDialog.priceDifference > 0 ? null : (
                            <Alert>
                                <Check className="size-4" />
                                <AlertTitle>Sin costo adicional</AlertTitle>
                                <AlertDescription>
                                    Este cambio no tiene costo adicional. El nuevo precio se aplicará en tu próxima factura.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter className="sm:flex-col">
                        <Button 
                            onClick={handleConfirmUpgrade}
                            disabled={confirmDialog.loading}
                            className="w-full h-12"
                        >
                            {confirmDialog.loading ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                "Confirmar upgrade"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
