"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface QueryProviderProps {
    children: ReactNode;
}

/**
 * Provider de React Query con configuración optimizada
 * - Cache por 5 minutos
 * - Revalidación en foco desactivada para reducir peticiones
 * - Retry automático 3 veces
 */
export function QueryProvider({ children }: QueryProviderProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Tiempo que los datos se consideran "frescos" (no se revalidan)
                        staleTime: 1000 * 60 * 5, // 5 minutos
                        
                        // Tiempo que los datos permanecen en cache
                        gcTime: 1000 * 60 * 10, // 10 minutos
                        
                        // No revalidar cuando la ventana vuelve al foco
                        // (reduce peticiones innecesarias)
                        refetchOnWindowFocus: false,
                        
                        // Reintentar 3 veces en caso de error
                        retry: 3,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                    },
                    mutations: {
                        // Reintentar 2 veces en mutaciones
                        retry: 2,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* Devtools solo visibles en desarrollo */}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
