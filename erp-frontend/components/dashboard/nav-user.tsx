"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
    MoreVertical,
    LogOut,
    User as UserIcon,
    Home,
    Moon,
    Sun,
    Shield,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface NavUserProps {
    user: {
        name?: string | null
        first_name?: string | null
        email?: string | null
        avatar?: string | null
        image?: string | null
        role?: string | null
    }
    variant?: "full" | "icon"
    isMobile?: boolean
    currentWorkspaceId?: string
}

export function NavUser({
    user,
    variant = "full",
    isMobile,
    currentWorkspaceId
}: NavUserProps) {
    const router = useRouter()
    const { resolvedTheme, setTheme } = useTheme()
    
    // Normalizar datos del usuario
    const displayName = user.name || user.first_name || "Usuario"
    const displayEmail = user.email || ""
    const displayImage = user.avatar || user.image || ""
    const isAdmin = user.role === "admin" || user.role === "super_admin"

    const handleLogout = () => {
        router.push("/logout")
    }

    // Trigger para variante "icon" (solo avatar)
    if (variant === "icon") {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                        <Avatar className="size-8">
                            <AvatarImage src={displayImage} alt={displayName} />
                            <AvatarFallback>{displayName.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {displayEmail}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem 
                            onClick={() => {
                                if (currentWorkspaceId) {
                                    router.push(`/workspaces/${currentWorkspaceId}/account`)
                                } else {
                                    router.push("/workspaces")
                                }
                            }} 
                            className="cursor-pointer"
                        >
                            <UserIcon className="mr-2 size-4" />
                            <span>Mi cuenta</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="cursor-pointer">
                            {resolvedTheme === "dark" ? (
                                <Sun className="mr-2 size-4" />
                            ) : (
                                <Moon className="mr-2 size-4" />
                            )}
                            <span>Cambiar tema</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push("/")} className="cursor-pointer">
                            <Home className="mr-2 size-4" />
                            <span>Página principal</span>
                        </DropdownMenuItem>
                        {isAdmin && (
                            <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                                <Shield className="mr-2 size-4" />
                                <span>Admin Dashboard</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 size-4" />
                        <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    // Trigger para variante "full" (sidebar con nombre)
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex items-center gap-2 w-full hover:bg-muted p-2 rounded-lg transition-colors data-[state=open]:bg-muted data-[state=open]:text-accent-foreground group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                >
                    <Avatar className="size-8 shrink-0 grayscale">
                        <AvatarImage src={displayImage} alt={displayName} />
                        <AvatarFallback>{displayName.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-medium">{displayName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                            {displayEmail}
                        </span>
                    </div>
                    <MoreVertical className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
            >
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8">
                            <AvatarImage src={displayImage} alt={displayName} />
                            <AvatarFallback>{displayName.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{displayName}</span>
                            <span className="truncate text-xs text-muted-foreground">
                                {displayEmail}
                            </span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem 
                        onClick={() => {
                            if (currentWorkspaceId) {
                                router.push(`/workspaces/${currentWorkspaceId}/account`)
                            } else {
                                router.push("/workspaces")
                            }
                        }} 
                        className="cursor-pointer"
                    >
                        <UserIcon className="mr-2 size-4" />
                        <span>Mi cuenta</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="cursor-pointer">
                        {resolvedTheme === "dark" ? (
                            <Sun className="mr-2 size-4" />
                        ) : (
                            <Moon className="mr-2 size-4" />
                        )}
                        <span>Cambiar tema</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/")} className="cursor-pointer">
                        <Home className="mr-2 size-4" />
                        <span>Página principal</span>
                    </DropdownMenuItem>
                    {isAdmin && (
                        <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                            <Shield className="mr-2 size-4" />
                            <span>Admin Dashboard</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 size-4" />
                    <span>Cerrar sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
