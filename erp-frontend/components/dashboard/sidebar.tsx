"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    CreditCard,
    BookOpen,
    HelpCircle,
    ShoppingCart,
    Contact,
    Search,
    Package,
    ArrowLeftRight,
    TrendingUp,
    Code2,
    LayoutGrid,
    Warehouse,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Logo } from "@/components/logo";
import { NavUser } from "./nav-user";
import {
    Sidebar as ShadcnSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    useSidebar
} from "@/components/ui/sidebar";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    role?: string;
}

interface SidebarProps {
    workspaces?: Workspace[];
    currentWorkspaceId?: string;
    isMobile?: boolean;
    onItemClick?: () => void;
    user?: {
        name?: string | null;
        first_name?: string | null;
        email?: string | null;
        avatar?: string | null;
        image?: string | null;
        role?: string | null;
    };
    currentPlan?: string;
}

export function Sidebar({
    workspaces = [],
    currentWorkspaceId,
    onItemClick,
    user,
    currentPlan,
}: SidebarProps) {
    const pathname = usePathname();
    const { state, isMobile } = useSidebar();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    type NavSection = {
        label: string;
        items: {
            title: string;
            href: string;
            icon: React.ComponentType<{ className?: string }>;
        }[];
    };

    const navSections: NavSection[] = [
        {
            label: "General",
            items: [
                {
                    title: "Dashboard",
                    href: `/workspaces/${currentWorkspaceId}`,
                    icon: LayoutDashboard,
                },
            ],
        },
        {
            label: "Comercial",
            items: [
                {
                    title: "Clientes",
                    href: `/workspaces/${currentWorkspaceId}/clients`,
                    icon: Contact,
                },
                {
                    title: "Ventas",
                    href: `/workspaces/${currentWorkspaceId}/sales`,
                    icon: TrendingUp,
                },
                {
                    title: "Nueva Venta",
                    href: `/workspaces/${currentWorkspaceId}/sales/new`,
                    icon: ArrowLeftRight,
                },
            ],
        },
        {
            label: "Catálogo",
            items: [
                {
                    title: "Lista de Productos",
                    href: `/workspaces/${currentWorkspaceId}/products`,
                    icon: Package,
                },
                {
                    title: "Inventario",
                    href: `/workspaces/${currentWorkspaceId}/inventory`,
                    icon: Search,
                },
                /* Ocultos temporalmente por petición
                {
                    title: "Categorías",
                    href: `/workspaces/${currentWorkspaceId}/categories`,
                    icon: LayoutGrid,
                },
                {
                    title: "Almacenes",
                    href: `/workspaces/${currentWorkspaceId}/warehouses`,
                    icon: Warehouse,
                },
                */
                {
                    title: "Proveedores",
                    href: `/workspaces/${currentWorkspaceId}/suppliers`,
                    icon: Contact,
                },
                {
                    title: "Órdenes de Compra",
                    href: `/workspaces/${currentWorkspaceId}/purchases`,
                    icon: ShoppingCart,
                },
            ],
        },
        {
            label: "Operaciones",
            items: [
                {
                    title: "Gestión de Operaciones",
                    href: `/workspaces/${currentWorkspaceId}/operations`,
                    icon: TrendingUp,
                },
                {
                    title: "Seguimiento",
                    href: `/workspaces/${currentWorkspaceId}/tracking`,
                    icon: Search,
                },
                {
                    title: "Couriers",
                    href: `/workspaces/${currentWorkspaceId}/couriers`,
                    icon: Package,
                },
            ],
        },
        {
            label: "Soporte",
            items: [
                {
                    title: "Tickets de Soporte",
                    href: `/workspaces/${currentWorkspaceId}/support-tickets`,
                    icon: HelpCircle,
                },
            ],
        },
        {
            label: "Configuración",
            items: [
                {
                    title: "Ajustes del Workspace",
                    href: `/workspaces/${currentWorkspaceId}/settings`,
                    icon: Settings,
                },
                {
                    title: "Miembros y Roles",
                    href: `/workspaces/${currentWorkspaceId}/members`,
                    icon: Users,
                },
                {
                    title: "Facturación",
                    href: `/workspaces/${currentWorkspaceId}/billing`,
                    icon: CreditCard,
                },
                {
                    title: "Integraciones",
                    href: `/workspaces/${currentWorkspaceId}/settings/integrations`,
                    icon: Code2,
                },
            ],
        },
    ];

    // Synchronize open sections with current pathname
    useEffect(() => {
        setOpenSections((prev) => {
            const updated = { ...prev };
            navSections.forEach((section) => {
                const hasActiveItem = section.items.some((item) => pathname === item.href);
                if (hasActiveItem) {
                    updated[section.label] = true;
                } else if (prev[section.label] === undefined) {
                    // Default General to open, others to closed initially
                    updated[section.label] = section.label === "General";
                }
            });
            return updated;
        });
    }, [pathname]);

    const toggleSection = (label: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    return (
        <ShadcnSidebar collapsible="icon">
            <SidebarHeader className="border-b h-16 shrink-0 group-data-[collapsible=icon]:p-0">
                <div className="flex items-center justify-start group-data-[collapsible=icon]:justify-center w-full h-full">
                    <Link href={`/workspaces/${currentWorkspaceId}`} onClick={onItemClick} className="flex items-center w-full justify-start transition-opacity overflow-hidden group-data-[collapsible=icon]:hidden px-2">
                        <Logo type="full" className="w-auto h-8" />
                    </Link>
                    <Link href={`/workspaces/${currentWorkspaceId}`} onClick={onItemClick} className="hidden items-center justify-center transition-opacity group-data-[collapsible=icon]:flex w-full h-full">
                        <Logo type="icon" width={20} height={20} className="shrink-0 justify-center" />
                    </Link>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <div className="p-2 border-b">
                    <WorkspaceSwitcher
                        workspaces={workspaces}
                        currentWorkspaceId={currentWorkspaceId}
                        currentPlan={currentPlan}
                    />
                </div>

                {navSections.map((section) => {
                    // Always show all icons in collapsed icon mode, otherwise use the openSections accordion state
                    const isOpen = state === "collapsed" ? true : !!openSections[section.label];
                    
                    return (
                        <SidebarGroup key={section.label} className="py-1">
                            <SidebarGroupLabel 
                                onClick={() => state !== "collapsed" && toggleSection(section.label)} 
                                className={`flex items-center justify-between text-xs font-semibold text-muted-foreground select-none py-1.5 px-3 w-full group/label transition-colors ${state !== "collapsed" ? "hover:text-foreground cursor-pointer" : ""}`}
                            >
                                <span>{section.label}</span>
                                <span className="group-data-[collapsible=icon]:hidden">
                                    {isOpen ? (
                                        <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover/label:opacity-100 transition-opacity" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover/label:opacity-100 transition-opacity" />
                                    )}
                                </span>
                            </SidebarGroupLabel>
                            
                            {isOpen && (
                                <SidebarGroupContent className="animate-in fade-in duration-200">
                                    <SidebarMenu>
                                        {section.items.map((item) => (
                                            <SidebarMenuItem key={item.href}>
                                                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                                                    <Link href={item.href} onClick={onItemClick}>
                                                        <item.icon className="size-4 shrink-0" />
                                                        <span className="text-sm font-medium">{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            )}
                        </SidebarGroup>
                    );
                })}

                <div className="mt-auto">
                    <SidebarGroup className="pt-0 pb-2">
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip="Documentación">
                                        <a href="https://docs.powip.com" target="_blank" rel="noopener noreferrer" onClick={onItemClick}>
                                            <BookOpen className="size-4 shrink-0" />
                                            <span className="text-sm font-medium">Documentación</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild tooltip="Ayuda">
                                        <Link href={`/workspaces/${currentWorkspaceId}/support`} onClick={onItemClick}>
                                            <HelpCircle className="size-4 shrink-0" />
                                            <span className="text-sm font-medium">Ayuda Central</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </div>
            </SidebarContent>

            {user && (
                <SidebarFooter className="border-t bg-muted/20">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <NavUser user={user} isMobile={isMobile} currentWorkspaceId={currentWorkspaceId} />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            )}

            <SidebarRail />
        </ShadcnSidebar>
    );
}
