"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { Loader2 } from "lucide-react";

// Helper to clear all cookies
const clearAllCookies = () => {
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
    
    // Clear with different domain/path combinations
    cookieNames.forEach((name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
    });
    
    // Also clear any other cookies that might be present
    document.cookie.split(";").forEach((cookie) => {
        const [name] = cookie.split("=");
        const trimmedName = name.trim();
        if (trimmedName.includes("auth") || trimmedName.includes("session") || trimmedName.includes("token")) {
            document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
    });
};

export default function LogoutPage() {
    useEffect(() => {
        const doLogout = async () => {
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear all cookies
            clearAllCookies();
            
            // Wait a bit to ensure everything is cleared
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Call NextAuth signOut
            await signOut({ 
                redirect: true,
                callbackUrl: `${window.location.origin}/login?logged_out=true` 
            });
        };
        
        doLogout();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Cerrando sesión...</p>
            </div>
        </div>
    );
}
