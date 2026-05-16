"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBillingPortalSession } from "@/lib/stripe-actions";
import { toast } from "sonner";

interface BillingPortalButtonProps {
    workspaceId: string;
    workspaceSlug: string;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link";
    className?: string;
    label?: string;
}

export function BillingPortalButton({
    workspaceId,
    workspaceSlug,
    variant = "outline",
    className,
    label = "Gestionar suscripción",
}: BillingPortalButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = React.useState(false);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/workspaces/${workspaceSlug}/billing`;

    async function handleClick() {
        setLoading(true);
        const result = await createBillingPortalSession({
            workspaceId,
            returnUrl,
        });

        if (result.portalUrl) {
            window.location.href = result.portalUrl;
        } else {
            console.error("Portal error:", result.error);
            toast.error(result.error || "Ocurrió un error al abrir el portal de facturación");
            setLoading(false);
        }
    }

    return (
        <Button
            variant={variant}
            className={className}
            onClick={handleClick}
            disabled={loading}
        >
            {loading ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <CreditCard className="size-4" />
            )}
            {label}
        </Button>
    );
}
