"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Shield } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Usuarios" },
    { href: "/admin/workspaces", label: "Workspaces" },
    { href: "/admin/plan-configs", label: "Planes Base" },
    { href: "/admin/plans", label: "Suscripciones" },
    { href: "/admin/audit-logs", label: "Audit Logs" },
];

export function AdminHeader() {
    const pathname = usePathname();

    return (
        <header className="h-16 border-b bg-card fixed top-0 w-full z-40 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu admin">
                            <Menu className="size-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 p-0">
                        <SheetHeader className="border-b px-4 py-4 text-left">
                            <SheetTitle>Admin Panel</SheetTitle>
                        </SheetHeader>
                        <nav className="flex flex-col gap-1 p-3">
                            {navItems.map((item) => {
                                const isActive = item.href === "/admin"
                                    ? pathname === "/admin"
                                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                            <Link
                                href="/workspaces"
                                className="mt-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                Volver al Dashboard
                            </Link>
                        </nav>
                    </SheetContent>
                </Sheet>
                <div className="size-8 bg-primary rounded-md flex items-center justify-center">
                    <Shield className="size-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="font-semibold text-lg">Admin Panel</h1>
                    <p className="text-xs text-muted-foreground">{APP_NAME} Management</p>
                </div>
            </div>
        </header>
    );
}
