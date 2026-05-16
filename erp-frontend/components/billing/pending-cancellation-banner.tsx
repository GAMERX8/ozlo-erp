"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBillingStatus, useReactivateSubscription, billingKeys } from "@/hooks/use-billing";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface PendingCancellationBannerProps {
  workspaceId: string;
}

export function PendingCancellationBanner({ workspaceId }: PendingCancellationBannerProps) {
  const queryClient = useQueryClient();
  const { data: billingStatus } = useBillingStatus(workspaceId);
  const reactivateMutation = useReactivateSubscription();

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: billingKeys.status(workspaceId),
    });
  }, [workspaceId, queryClient]);

  if (!billingStatus?.isPendingCancellation) return null;

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync(workspaceId);
      toast.success("Suscripción reactivada correctamente");
    } catch (error) {
      toast.error("Error al reactivar la suscripción");
    }
  };

  const cancellationDate = billingStatus.cancellationDate
    ? new Date(billingStatus.cancellationDate)
    : null;

  const daysLeft = cancellationDate
    ? Math.max(1, Math.ceil((cancellationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div>
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle />
        <AlertTitle>Tu suscripción expirará en {daysLeft} {daysLeft === 1 ? "día" : "días"}.</AlertTitle>
        <AlertDescription>
          Renueva ahora para evitar la interrupción del servicio o reactiva tu plan para seguir usando el servicio.
        </AlertDescription>
        <AlertAction>
          <Button
            onClick={handleReactivate}
            disabled={reactivateMutation.isPending}
            size="xs"
            className="shrink-0"
          >
            {reactivateMutation.isPending ? "Reactivando..." : "Reactivar"}
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
