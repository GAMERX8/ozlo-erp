"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";

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

/**
 * Este componente maneja el callback de OAuth desde sessionStorage.
 * Actúa como respaldo para casos donde el usuario refresca la página
 * antes de que se complete la autenticación.
 */
export function OAuthCallbackHandler() {
    const { status } = useSession();

    useEffect(() => {
        // Solo procesar si no estamos autenticados
        if (status === "authenticated") {
            return;
        }

        const handleOAuthCallback = async () => {
            // Verificar si hay datos de OAuth callback en sessionStorage
            const oauthDataStr = sessionStorage.getItem("oauth_callback_data");
            
            if (oauthDataStr) {
                try {
                    // Limpiar TODO lo relacionado con sesiones anteriores
                    sessionStorage.removeItem("oauth_callback_data");
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("mfa_temp_token");
                    localStorage.removeItem("mfa_temp_user");
                    
                    // Limpiar cookies de sesión anteriores de NextAuth
                    clearNextAuthCookies();
                    
                    // Pequeña pausa para asegurar que todo se limpió
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Hacer sign in con los datos de OAuth
                    const result = await signIn("oauth-callback", {
                        oauthData: oauthDataStr,
                        redirect: false,
                    });

                    if (result?.error) {
                        console.error("OAuth sign in error:", result.error);
                        // Redirigir a login con error
                        window.location.href = "/login?error=oauth_signin_failed";
                    }
                    // Si es exitoso, el usuario ya está autenticado
                } catch (error) {
                    console.error("OAuth callback handler error:", error);
                }
            }
        };

        handleOAuthCallback();
    }, [status]);

    // Este componente no renderiza nada
    return null;
}
