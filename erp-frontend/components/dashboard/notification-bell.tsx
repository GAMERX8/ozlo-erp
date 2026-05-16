"use client";

import { useState, useTransition } from "react";
import { Bell, Check, X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { acceptInvitation, rejectInvitation } from "@/lib/invitation-actions";
import type { WorkspaceInvitation } from "@/types";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
    initialInvitations: WorkspaceInvitation[];
    themeColor?: string;
}

export function NotificationBell({ initialInvitations, themeColor }: NotificationBellProps) {
    const [invitations, setInvitations] = useState<WorkspaceInvitation[]>(initialInvitations);
    const [isPendingAction, startTransition] = useTransition();
    const pendingCount = invitations.length;

    const handleAccept = async (id: string, workspaceName: string) => {
        startTransition(async () => {
            const result = await acceptInvitation(id);
            if (result.success) {
                setInvitations((prev) => prev.filter((inv) => inv.id !== id));
                toast.success(`Te has unido a ${workspaceName}`, {
                    description: "La invitación ha sido aceptada correctamente.",
                });
            } else {
                toast.error("Error", {
                    description: result.error || "No se pudo aceptar la invitación.",
                });
            }
        });
    };

    const handleReject = async (id: string, workspaceName: string) => {
        startTransition(async () => {
            const result = await rejectInvitation(id);
            if (result.success) {
                setInvitations((prev) => prev.filter((inv) => inv.id !== id));
                toast.info("Invitación rechazada", {
                    description: `Has rechazado la invitación a ${workspaceName}.`,
                });
            } else {
                toast.error("Error", {
                    description: result.error || "No se pudo rechazar la invitación.",
                });
            }
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="relative text-foreground rounded-full">
                    <Bell className="size-5" />
                    {pendingCount > 0 && (
                        <span className="absolute top-2 right-2 flex size-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full size-2.5 bg-red-600 border-2 border-background"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    Notificaciones
                    {pendingCount > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {invitations.length === 0 ? (
                    <div className="py-6 text-center">
                        <Bell className="mx-auto size-8 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mt-2">No tienes notificaciones nuevas</p>
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                        {invitations.map((inv) => {
                            const workspace = typeof inv.workspace_id === 'object' ? inv.workspace_id : inv.workspace;
                            const inviter = typeof inv.invited_by === 'object' ? inv.invited_by : inv.invited_by_user;
                            const inviterName = inviter 
                                ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email 
                                : 'Alguien';

                            return (
                                <div key={inv.id} className="flex flex-col p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <div className="flex gap-3 mb-3">
                                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <UserPlus className="size-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col flex-1 gap-1">
                                            <p className="text-sm leading-none font-medium">
                                                Invitación a workspace
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                <span className="font-semibold text-foreground">
                                                    {inviterName}
                                                </span>{" "}
                                                te invitó a unirte a{" "}
                                                <span className="font-semibold text-foreground">
                                                    {workspace?.name || 'Workspace'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 flex-1"
                                            onClick={() => handleAccept(inv.id, workspace?.name || 'Workspace')}
                                            disabled={isPendingAction}
                                        >
                                            {isPendingAction ? (
                                                <Loader2 className="size-3 animate-spin mr-1" />
                                            ) : (
                                                <Check className="size-3 mr-1" />
                                            )}
                                            Aceptar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 flex-1"
                                            onClick={() => handleReject(inv.id, workspace?.name || 'Workspace')}
                                            disabled={isPendingAction}
                                        >
                                            <X className="size-3 mr-1" />
                                            Rechazar
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
