"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Loader2,
    CreditCard,
    ChevronLeft,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Onboarding } from "@/components/subscription/onboarding";
import { createCheckoutSession } from "@/lib/stripe-actions";
import { getWorkspaceBillingStatus } from "@/lib/stripe-actions";

interface OnboardingFormProps {
    workspaceId: string;
    workspaceSlug: string;
    userEmail: string;
    isModal?: boolean;
    skipPlanSelection?: boolean;
}

export function OnboardingForm({
    workspaceId,
    workspaceSlug,
    userEmail,
    isModal = false,
    skipPlanSelection = false,
}: OnboardingFormProps) {
    const router = useRouter();
    
    const [step, setStep] = React.useState(skipPlanSelection ? 1 : 1);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null);
    const [billingStatus, setBillingStatus] = React.useState<any>(null);

    React.useEffect(() => {
        if (skipPlanSelection) {
            loadBillingStatus();
        }
    }, [skipPlanSelection]);

    const loadBillingStatus = async () => {
        const result = await getWorkspaceBillingStatus(workspaceId);
        if (result.success) {
            setBillingStatus(result.data);
        }
    };

    const handleSelectPlan = (plan: string) => {
        setSelectedPlan(plan);
    };

    const handleContinueToConfig = () => {
        if (!selectedPlan) {
            toast.error("Por favor selecciona un plan");
            return;
        }
        setStep(2);
    };

    const handleActivate = async () => {
        setLoading(true);
        setError(null);

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
        const successUrl = `${appUrl}/workspaces/${workspaceSlug}/success`;
        const cancelUrl = `${appUrl}/workspaces/${workspaceSlug}`;

        const result = await createCheckoutSession({
            workspaceId,
            plan: selectedPlan!,
            successUrl,
            cancelUrl,
        });

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
        }
    };

    return (
        <div className={cn(
            "flex flex-col flex-1 min-h-0 relative w-full",
            !isModal && "max-w-4xl mx-auto"
        )}>
            {/* Progress Steps */}
            {!skipPlanSelection && (
                <div className="px-6 sm:px-8 pt-6 pb-2">
                    <div className="flex items-center justify-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2",
                            step === 1 ? "text-primary" : "text-muted-foreground"
                        )}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                                1
                            </div>
                            <span className="hidden sm:inline text-sm font-medium">Plan</span>
                        </div>
                        <div className="w-12 h-0.5 bg-muted" />
                        <div className={cn(
                            "flex items-center gap-2",
                            step === 2 ? "text-primary" : "text-muted-foreground"
                        )}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                                2
                            </div>
                            <span className="hidden sm:inline text-sm font-medium">Confirmar</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={cn(
                "flex-1 overflow-y-auto custom-scrollbar",
                isModal ? "px-6 sm:px-8 py-6" : "py-4"
            )}>
                {step === 1 && !skipPlanSelection ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            <Onboarding
                                workspaceId={workspaceId}
                                workspaceSlug={workspaceSlug}
                                userEmail={userEmail}
                            />
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button
                                onClick={handleContinueToConfig}
                                disabled={!selectedPlan}
                                size="lg"
                                className="h-12 px-8"
                            >
                                Continuar
                                <ChevronLeft className="size-4 ml-2 rotate-180" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        "flex flex-col min-h-full items-center justify-center",
                        isModal ? "" : "items-stretch"
                    )}>
                        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-center mb-8">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
                                    Confirmar Suscripción
                                </h1>
                                <p className="text-base text-muted-foreground">
                                    {selectedPlan 
                                        ? `Estás a punto de suscribirte al plan ${selectedPlan}.`
                                        : "Selecciona un plan para continuar."}
                                </p>
                            </div>

                            {error && (
                                <Alert variant="destructive" className="mt-6">
                                    <AlertCircle className="size-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {step === 2 && (
                <div className={cn("pb-8 w-full", isModal ? "px-6 sm:px-8" : "max-w-md mx-auto px-0")}>
                    <div className="flex gap-3">
                        {!skipPlanSelection && (
                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                size="lg"
                                className="h-14 px-6"
                            >
                                <ChevronLeft className="size-5 mr-2" />
                                Atrás
                            </Button>
                        )}
                        <Button
                            onClick={handleActivate}
                            disabled={loading}
                            size="lg"
                            className="flex-1 h-14 text-base font-semibold"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="size-5 animate-spin mr-2" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="size-5 mr-2" />
                                    Pagar y Suscribirse
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-3">
                        Podrás cambiar estas configuraciones más tarde
                    </p>
                </div>
            )}
        </div>
    );
}