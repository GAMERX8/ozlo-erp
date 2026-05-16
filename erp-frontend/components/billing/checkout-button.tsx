"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonProps } from "@/components/ui/button";
import { createCheckoutSession, getWorkspaceBillingStatus } from "@/lib/stripe-actions";
import { toast } from "sonner";
import { Loader2, CreditCard, Plus } from "lucide-react";

interface CheckoutButtonProps extends ButtonProps {
    workspaceId: string;
    workspaceSlug: string;
    plan?: string;
    label?: string;
    checkPlan?: boolean;
}

export function CheckoutButton({
    workspaceId,
    workspaceSlug,
    plan = "starter",
    label = "Suscribirse",
    checkPlan = false,
    ...props
}: CheckoutButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        
        try {
            // Si necesitamos verificar el plan actual primero
            if (checkPlan) {
                const statusResult = await getWorkspaceBillingStatus(workspaceId);
                
                if (statusResult.success && statusResult.data?.isActive) {
                    // Ya tiene plan activo, redirigir a crear instancia
                    router.push(`/workspaces/${workspaceSlug}?create=true`);
                    return;
                }
            }

            // Crear sesión de checkout
            const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
            const result = await createCheckoutSession({
                workspaceId,
                plan,
                successUrl: `${appUrl}/workspaces/${workspaceSlug}/success`,
                cancelUrl: `${appUrl}/workspaces/${workspaceSlug}`,
            });
            
            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            }
        } catch (error) {
            toast.error("Error al iniciar el checkout");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button 
            onClick={handleCheckout} 
            disabled={isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
            ) : checkPlan ? (
                <Plus className="size-4 mr-2" />
            ) : (
                <CreditCard className="size-4 mr-2" />
            )}
            {isLoading ? "Redirigiendo..." : label}
        </Button>
    );
}
