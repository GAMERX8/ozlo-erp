"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PaymentSuccessHandlerProps {
    workspaceId: string;
    workspaceSlug: string;
}

export function PaymentSuccessHandler({ workspaceId, workspaceSlug }: PaymentSuccessHandlerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        const checkDeployStatus = async () => {
            const payment = searchParams.get("payment");
            
            // Solo actuar si hay payment=success
            if (payment !== "success") return;
            
            // Mostrar toast de éxito
            toast.success("¡Pago exitoso!", {
                description: "Tu instancia se está creando...",
            });

            // Limpiar el param de la URL sin recargar
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            
            setHasChecked(true);
        };

        if (session?.user && workspaceId && !hasChecked) {
            checkDeployStatus();
        }
    }, [searchParams, session, workspaceId, hasChecked]);

    return null;
}
