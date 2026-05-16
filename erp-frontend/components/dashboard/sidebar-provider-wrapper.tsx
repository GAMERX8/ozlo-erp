"use client";

import { SidebarCleanup } from "./sidebar-cleanup";

export function SidebarProviderWrapper({ children }: { children: React.ReactNode }) {
    return (
        <>
            <SidebarCleanup />
            {children}
        </>
    );
}
