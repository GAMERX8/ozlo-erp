"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useState } from "react";

interface MobileSidebarProps {
    workspaces?: any[];
    currentWorkspaceId?: string;
    currentPlan?: string;
}

export function MobileSidebar({
    workspaces = [],
    currentWorkspaceId,
    currentPlan,
}: MobileSidebarProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden mr-2 -ml-2 text-muted-foreground"
                >
                    <Menu className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-background w-72">
                <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                <Sidebar
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    currentPlan={currentPlan}
                    isMobile={true}
                    onItemClick={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    );
}
