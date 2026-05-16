"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error boundary para la sección de admin
 */
export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="container max-w-4xl py-12">
            <Card>
                <CardHeader className="text-center">
                    <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="size-8 text-destructive" />
                    </div>
                    <CardTitle className="text-xl">Error en el panel de administración</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground text-center">
                        No se pudo cargar esta sección del panel de administración.
                    </p>
                    
                    <div className="flex gap-2 justify-center pt-2">
                        <Button variant="outline" onClick={reset} className="gap-2">
                            <RefreshCw className="size-4" />
                            Intentar de nuevo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
