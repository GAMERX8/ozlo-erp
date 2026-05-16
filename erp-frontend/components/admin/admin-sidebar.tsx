"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Building2,
    Box,
    CreditCard,
    Server,
    Settings,
    ClipboardList,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavUser } from "@/components/dashboard/nav-user";

const navItems = [
    {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
    },
    {
        href: "/admin/users",
        label: "Usuarios",
        icon: Users,
    },
    {
        href: "/admin/workspaces",
        label: "Workspaces",
        icon: Building2,
    },
    {
        href: "/admin/plan-configs",
        label: "Planes Base",
        icon: Tag,
    },
    {
        href: "/admin/plans",
        label: "Suscripciones",
        icon: CreditCard,
    },
    {
        href: "/admin/audit-logs",
        label: "Audit Logs",
        icon: ClipboardList,
    },
];

export function AdminSidebar({ user }: { user: any }) {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex w-64 h-full fixed top-0 left-0 pt-16 z-30 border-r bg-card flex-col">
            <nav className="flex flex-col p-4 flex-1 gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className="size-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto">
                <div className="p-4 border-t">
                    <Link
                        href="/workspaces"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Settings className="size-4" />
                        Volver al Dashboard
                    </Link>
                </div>
                {user && (
                    <div className="p-2 border-t">
                        <NavUser
                            user={{
                                name: user.first_name || user.name || "Administrador",
                                email: user.email || "",
                                avatar: user.image || "",
                                role: user.role,
                            }}
                            isMobile={false}
                        />
                    </div>
                )}
            </div>
        </aside>
    );
}
