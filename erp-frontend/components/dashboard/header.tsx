"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardLogo } from "./dashboard-logo";

interface DashboardHeaderProps {
    user: {
        name: string;
        email: string;
        image?: string | null;
        role?: string | null;
    };
    workspaces?: any[];
    currentWorkspaceId?: string;
    workspaceId?: string;
    currentPlan?: string;
}

export function DashboardHeader({
    user,
    workspaces = [],
    currentWorkspaceId,
    currentPlan,
}: DashboardHeaderProps) {
    return (
        <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />

            <div className="flex items-center gap-2 font-semibold md:hidden">
                <DashboardLogo currentWorkspaceId={currentWorkspaceId} />
            </div>
        </header>
    );
}
