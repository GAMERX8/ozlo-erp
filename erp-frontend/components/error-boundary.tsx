"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary para capturar errores en componentes React
 * Prende que la app completa se rompa y muestra un fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Actualiza el estado para que el siguiente render muestre el fallback
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log del error para debugging
        console.error("Uncaught error:", error, errorInfo);

        // Callback opcional para manejo custom (ej: enviar a Sentry)
        this.props.onError?.(error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            // Si hay un fallback custom, úsalo
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Fallback por defecto
            return (
                <div className="min-h-[400px] flex items-center justify-center p-4">
                    <Card className="max-w-md w-full">
                        <CardHeader className="text-center">
                            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="size-8 text-destructive" />
                            </div>
                            <CardTitle className="text-xl">Algo salió mal</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Ha ocurrido un error inesperado. Puedes intentar recargar la página o volver al inicio.
                            </p>
                            
                            {this.state.error && (
                                <details className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                                    <summary className="cursor-pointer font-medium">
                                        Ver detalles del error
                                    </summary>
                                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">
                                        {this.state.error.message}
                                    </pre>
                                </details>
                            )}

                            <div className="flex gap-2 justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={this.handleRetry}
                                    className="gap-2"
                                >
                                    <RefreshCw className="size-4" />
                                    Intentar de nuevo
                                </Button>
                                <Button asChild>
                                    <Link href="/workspaces" className="gap-2">
                                        <Home className="size-4" />
                                        Ir al inicio
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Error Boundary específico para secciones del dashboard
 */
export function DashboardErrorBoundary({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <ErrorBoundary
            fallback={
                <Card className="border-destructive/50">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            <CardTitle className="text-base">
                                {title || "Error al cargar la sección"}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            No se pudo cargar esta sección. Intenta recargar la página.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="size-4 mr-2" />
                            Recargar
                        </Button>
                    </CardContent>
                </Card>
            }
        >
            {children}
        </ErrorBoundary>
    );
}

/**
 * HOC para envolver componentes con Error Boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<Props, "children">
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
