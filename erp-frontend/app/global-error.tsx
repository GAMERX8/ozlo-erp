"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary global para la aplicación entera
 * Se muestra cuando hay errores en el root layout
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <html>
            <body className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="max-w-md w-full p-6 text-center">
                    <h1 className="text-2xl font-bold mb-4">Error crítico</h1>
                    <p className="text-muted-foreground mb-6">
                        Ha ocurrido un error inesperado. Por favor, recarga la página.
                    </p>
                    <Button onClick={reset}>
                        Recargar aplicación
                    </Button>
                </div>
            </body>
        </html>
    );
}
