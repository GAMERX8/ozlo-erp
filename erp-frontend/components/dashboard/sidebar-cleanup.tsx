"use client";

import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarCleanup() {
    const { setOpenMobile } = useSidebar();

    useEffect(() => {
        // Cleanup cuando el componente se desmonte
        return () => {
            setOpenMobile(false);
        };
    }, [setOpenMobile]);

    return null;
}
