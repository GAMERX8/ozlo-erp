"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { logger } from "@/lib/logger";

// Helper to clear all NextAuth cookies properly
const clearNextAuthCookies = () => {
    const cookieNames = [
        "next-auth.session-token",
        "next-auth.callback-url",
        "next-auth.csrf-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.callback-url",
        "__Secure-next-auth.csrf-token",
        "__Host-next-auth.csrf-token",
        "oauth_in_progress",
    ];
    
    cookieNames.forEach((name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });
};

function AuthCallbackContent() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get("token");
            const errorParam = searchParams.get("error");

            if (errorParam) {
                setError("Error de autenticación. Por favor intenta de nuevo.");
                setIsProcessing(false);
                setTimeout(() => {
                    window.location.href = "/login?error=oauth_failed";
                }, 2000);
                return;
            }

            if (!token) {
                setError("Token no encontrado.");
                setIsProcessing(false);
                setTimeout(() => {
                    window.location.href = "/login?error=no_token";
                }, 2000);
                return;
            }

            try {
                // Limpiar cualquier sesión anterior antes de procesar la nueva
                localStorage.removeItem("access_token");
                localStorage.removeItem("mfa_temp_token");
                localStorage.removeItem("mfa_temp_user");
                sessionStorage.removeItem("oauth_callback_data");
                
                // Limpiar cookies de sesión anteriores de NextAuth
                clearNextAuthCookies();
                
                // Pequeña pausa para asegurar que todo se limpió
                await new Promise(resolve => setTimeout(resolve, 100));

                // Obtener perfil del usuario con el token
                const response = await fetch(`${API_URL}/auth/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch user profile");
                }

                const userData = await response.json();

                // Crear datos de sesión para OAuth
                const sessionData = {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    role: userData.role,
                    access_token: token,
                    provider: searchParams.get("provider") || "oauth",
                };

                // Hacer sign in con los datos de OAuth
                // Usamos redirect: false para manejar manualmente la redirección
                const result = await signIn("oauth-callback", {
                    oauthData: JSON.stringify(sessionData),
                    redirect: false,
                });

                if (result?.error) {
                    logger.error("OAuth sign in error:", result.error);
                    throw new Error(`Sign in failed: ${result.error}`);
                }

                if (result?.ok) {
                    // Éxito - redirigir a dashboard
                    // Usamos window.location.href para forzar recarga completa
                    window.location.href = "/workspaces";
                } else {
                    throw new Error("Sign in returned unexpected result");
                }
            } catch (err) {
                logger.error("OAuth callback error:", err);
                setError("Error al procesar la autenticación.");
                setIsProcessing(false);
                setTimeout(() => {
                    window.location.href = "/login?error=callback_failed";
                }, 2000);
            }
        };

        handleCallback();
    }, [searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-destructive">{error}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Redirigiendo...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">
                    {isProcessing ? "Completando autenticación..." : "Redirigiendo..."}
                </p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando...</p>
                </div>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
