"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useSidebar } from "@/components/ui/sidebar";

interface DashboardLogoProps {
    currentWorkspaceId?: string;
}

export function DashboardLogo({ currentWorkspaceId }: DashboardLogoProps) {
    const { setOpenMobile } = useSidebar();

    const handleClick = () => {
        // Cerrar el sidebar móvil antes de navegar
        setOpenMobile(false);
    };

    return (
        <Link 
            href={currentWorkspaceId ? `/workspaces/${currentWorkspaceId}` : '/workspaces'} 
            onClick={handleClick}
            className="flex items-center gap-2"
        >
            <Logo height={40} />
        </Link>
    );
}
