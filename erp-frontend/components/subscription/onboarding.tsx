"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
    Terminal,
    MessageSquarePlus,
    Loader2,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createCheckoutSession, getAvailablePlans } from "@/lib/stripe-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Plan {
    id: string;
    name: string;
    price: number;
    isRecommended?: boolean;
    features: string[];
}

interface OnboardingProps {
    workspaceId: string;
    workspaceSlug: string;
    userEmail: string;
}

export function Onboarding({ workspaceId, workspaceSlug, userEmail }: OnboardingProps) {
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>("");
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadPlans() {
            try {
                const result = await getAvailablePlans();
                if (result.success && result.plans) {
                    // Filtrar plan free y ordenar por precio
                    const paidPlans = result.plans.filter((p: Plan) => p.id !== "free");
                    setPlans(paidPlans);
                    // Seleccionar el plan recomendado por defecto, o el primero
                    const recommended = paidPlans.find((p: Plan) => p.isRecommended);
                    setSelectedPlan(recommended?.id || paidPlans[0]?.id || "");
                } else {
                    toast.error("Error al cargar los planes");
                }
            } catch (error) {
                toast.error("Error de conexión al cargar los planes");
            } finally {
                setIsLoadingPlans(false);
            }
        }
        loadPlans();
    }, []);

    async function handleDeploy() {
        setLoading(true);
        try {
            // Crear checkout con plan seleccionado
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const checkoutResult = await createCheckoutSession({
                workspaceId,
                plan: selectedPlan,
                successUrl: `${appUrl}/workspaces/${workspaceSlug}?payment=success`,
                cancelUrl: `${appUrl}/workspaces/${workspaceSlug}?payment=canceled`,
            });

            if (checkoutResult.error) {
                toast.error(checkoutResult.error);
                setLoading(false);
                return;
            }

            if (checkoutResult.checkoutUrl) {
                // Redirigir a Stripe Checkout
                window.location.href = checkoutResult.checkoutUrl;
            }
        } catch (err) {
            toast.error("Ocurrió un error al iniciar el pago.");
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col w-full max-w-2xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-700 gap-8">
            {/* Hero Card with Text Overlay */}
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg">
                <img
                    src="/videos/kimi.png"
                    alt="Don Claw"
                    className="w-full h-auto object-cover"
                />
                {/* Text Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-black drop-shadow-lg">
                        Don Claw
                    </h2>
                    <Badge variant="default" className="font-bold px-4 py-1 text-xs tracking-wider uppercase mt-2">
                        Beta
                    </Badge>
                </div>
            </div>

            {/* Plan Selector */}
            {isLoadingPlans ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-4 ${plans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                    {plans.map((plan) => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${
                                selectedPlan === plan.id
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border bg-card hover:border-primary/30"
                            }`}
                        >
                            <div className="font-semibold text-foreground flex items-center gap-2">
                                {plan.name}
                                {plan.isRecommended && (
                                    <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                                )}
                            </div>
                            <div className="text-2xl font-bold text-foreground">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                            <div className="text-xs text-muted-foreground mt-1">Acceso total a todos los módulos</div>
                        </button>
                    ))}
                </div>
            )}

            {/* Features */}
            <div className="flex flex-col gap-5">
                <div className="flex gap-4 items-start p-4 rounded-xl bg-card border border-border">
                    <div className="flex-shrink-0 size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Sparkles className="size-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-foreground">
                            Gestión Centralizada
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Controla todos los aspectos de tu negocio desde una única plataforma intuitiva y potente.
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-xl bg-card border border-border">
                    <div className="flex-shrink-0 size-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <MessageSquarePlus className="size-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-foreground">
                            Asistente de IA Integrado
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Optimiza tus procesos con nuestro asistente inteligente capaz de analizar datos y automatizar tareas.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
                <Button
                    onClick={handleDeploy}
                    disabled={loading}
                    size="lg"
                    className="w-full h-14 text-base font-semibold"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 size-5 animate-spin" />
                            Iniciando pago seguro...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 size-5" />
                            Suscribirme al Plan {plans.find(p => p.id === selectedPlan)?.name || selectedPlan}
                        </>
                    )}
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-3">
                    Pago seguro con Stripe • Suscripción mensual • Cancela cuando quieras
                </p>
            </div>
        </div>
    );
}
