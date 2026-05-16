"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Error boundary para la página de cuenta
 */
export default function AccountError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log del error para debugging
        console.error("Account page error:", error);
    }, [error]);

    return (
        <div className="container max-w-2xl py-12">
            <Card>
                <CardHeader className="text-center">
                    <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="size-8 text-destructive" />
                    </div>
                    <CardTitle className="text-xl">Error al cargar tu cuenta</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground text-center">
                        No se pudo cargar la información de tu cuenta. Por favor, intenta de nuevo.
                    </p>
                    
                    <div className="flex gap-2 justify-center pt-2">
                        <Button variant="outline" onClick={reset} className="gap-2">
                            <RefreshCw className="size-4" />
                            Intentar de nuevo
                        </Button>
                        <Button asChild>
                            <Link href="/workspaces" className="gap-2">
                                <Home className="size-4" />
                                Ir al dashboard
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
