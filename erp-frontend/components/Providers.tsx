"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { OAuthCallbackHandler } from "@/components/oauth-callback-handler";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/components/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary>
            <QueryProvider>
                <SessionProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <OAuthCallbackHandler />
                        {children}
                    </ThemeProvider>
                </SessionProvider>
            </QueryProvider>
        </ErrorBoundary>
    );
}
