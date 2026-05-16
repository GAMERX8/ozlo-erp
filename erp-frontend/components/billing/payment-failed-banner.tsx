"use client";

import { AlertCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBillingStatus } from "@/hooks/use-billing";
import { useState } from "react";
import { createBillingPortalSession } from "@/lib/stripe-actions";
import { toast } from "sonner";

interface PaymentFailedBannerProps {
  workspaceId: string;
}

export function PaymentFailedBanner({ workspaceId }: PaymentFailedBannerProps) {
  const { data: billingStatus } = useBillingStatus(workspaceId);
  const [isLoading, setIsLoading] = useState(false);

  if (!billingStatus?.isPastDue) return null;

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    try {
      const result = await createBillingPortalSession({
        workspaceId,
        returnUrl: window.location.href,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.portalUrl) {
        window.location.href = result.portalUrl;
      }
    } catch (error) {
      toast.error("Error al abrir el portal de facturación");
    }
    setIsLoading(false);
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle />
      <AlertTitle>Tu pago ha fallado.</AlertTitle>
      <AlertDescription>
        Actualiza tu método de pago para evitar la suspensión de tu suscripción.
      </AlertDescription>
      <AlertAction>
        <Button 
          onClick={handleUpdatePayment}
          disabled={isLoading}
          size="sm"
          variant="destructive"
          className="shrink-0"
        >
          <CreditCard className="size-4 mr-2" />
          {isLoading ? "Cargando..." : "Actualizar pago"}
        </Button>
      </AlertAction>
    </Alert>
  );
}
