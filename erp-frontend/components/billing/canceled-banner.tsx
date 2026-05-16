"use client";

import { XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBillingStatus, useReactivateSubscription } from "@/hooks/use-billing";
import { toast } from "sonner";

interface CanceledBannerProps {
  workspaceId: string;
}

export function CanceledBanner({ workspaceId }: CanceledBannerProps) {
  const { data: billingStatus } = useBillingStatus(workspaceId);
  const reactivateMutation = useReactivateSubscription();

  if (!billingStatus?.planStatus || billingStatus.planStatus !== "canceled") return null;

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(workspaceId);
      toast.success("Suscripción reactivada correctamente");
    } catch (error) {
      toast.error("Error al reactivar la suscripción");
    }
  };

  return (
    <Alert className="mb-6">
      <XCircle />
      <AlertTitle>Tu suscripción ha sido cancelada.</AlertTitle>
      <AlertDescription>
        Has sido cambiado al plan Free. Reactiva tu plan para recuperar todas las funciones.
      </AlertDescription>
      <AlertAction>
        <Button 
          onClick={handleReactivate}
          disabled={reactivateMutation.isPending}
          size="sm"
          className="shrink-0"
        >
          <RotateCcw className="size-4 mr-2" />
          {reactivateMutation.isPending ? "Reactivando..." : "Reactivar"}
        </Button>
      </AlertAction>
    </Alert>
  );
}
