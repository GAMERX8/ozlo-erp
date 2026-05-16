"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
    params: Promise<{ workspaceId: string }>;
}

export default function BillingSuccessPage({ params }: Props) {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            params.then(({ workspaceId }) => {
                router.push(`/workspaces/${workspaceId}`);
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [params, router]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="w-full max-w-xl">
                <Alert className="shadow-sm">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle className="text-base">¡Pago completado!</AlertTitle>
                    <AlertDescription className="mt-2 flex flex-col gap-3">
                        <p>Tu plan ha sido activado exitosamente.</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Redirigiendo al dashboard...</span>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}