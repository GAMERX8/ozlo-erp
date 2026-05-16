"use client";

import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Error boundary para todas las páginas de workspaces
 * Captura errores en /workspaces/* y muestra un fallback UI
 */
export default function WorkspaceError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-[400px] flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center">
                        <h2 className="text-xl font-semibold mb-2">Error en el workspace</h2>
                        <p className="text-muted-foreground mb-4">
                            Ha ocurrido un error al cargar esta página.
                        </p>
                        <button
                            onClick={reset}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                </div>
            }
        >
            <></>
        </ErrorBoundary>
    );
}
