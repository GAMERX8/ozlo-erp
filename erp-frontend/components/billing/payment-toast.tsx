"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface PaymentToastProps {
    paymentStatus?: string;
}

export function PaymentToast({ paymentStatus }: PaymentToastProps) {
    const hasShown = useRef(false);

    useEffect(() => {
        if (hasShown.current) return;
        
        // Leer directamente de URL para mayor confiabilidad
        if (typeof window === "undefined") return;
        
        const params = new URLSearchParams(window.location.search);
        const status = params.get("payment") || paymentStatus;

        if (status === "success") {
            hasShown.current = true;
            toast.success("¡Pago completado! Tu suscripción está activa.", {
                duration: 5000,
            });
            // Limpiar URL sin recargar
            params.delete("payment");
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, "", newUrl.replace(/\?$/, ""));
        } else if (status === "canceled") {
            hasShown.current = true;
            toast.info("El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.", {
                duration: 5000,
            });
            // Limpiar URL sin recargar
            params.delete("payment");
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, "", newUrl.replace(/\?$/, ""));
        }
    }, [paymentStatus]);

    return null;
}
