"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronRight, Boxes, Mail, Check, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import { acceptInvitation, rejectInvitation } from "@/lib/invitation-actions";
import { toast } from "sonner";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    members?: any[];
    plan?: string;
    projectCount?: number;
}

interface Invitation {
    id: string;
    status: string;
    date_created: string;
    workspace_id: string | {
        id: string;
        name: string;
        slug: string;
    };
    invited_by: string | {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

interface WorkspaceSelectorProps {
    initialWorkspaces: Workspace[];
    pendingInvitations?: Invitation[];
    userName?: string;
    userEmail?: string;
}

// Helper functions for type unions
const getWorkspaceInfo = (workspace_id: Invitation["workspace_id"]) => {
    if (typeof workspace_id === 'string') {
        return { name: 'Workspace', slug: '' };
    }
    return workspace_id;
};

const getInviterInfo = (invited_by: Invitation["invited_by"]) => {
    if (typeof invited_by === 'string') {
        return { first_name: 'Usuario', last_name: '', email: '' };
    }
    return invited_by;
};

export function WorkspaceSelector({
    initialWorkspaces,
    pendingInvitations = [],
    userName,
    userEmail
}: WorkspaceSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const router = useRouter();

    // Filtrar workspaces
    const filteredWorkspaces = initialWorkspaces.filter(ws =>
        ws.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleWorkspaceSelect = (workspaceSlug: string) => {
        router.push(`/workspaces/${workspaceSlug}`);
    };

    const handleAcceptInvitation = async (invitationId: string) => {
        setProcessingId(invitationId);
        startTransition(async () => {
            const result = await acceptInvitation(invitationId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("¡Invitación aceptada! Ahora eres miembro del workspace.");
                router.refresh();
            }
            setProcessingId(null);
        });
    };

    const handleRejectInvitation = async (invitationId: string) => {
        setProcessingId(invitationId);
        startTransition(async () => {
            const result = await rejectInvitation(invitationId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invitación rechazada");
                router.refresh();
            }
            setProcessingId(null);
        });
    };

    return (
        <div className="flex flex-col w-full max-w-7xl mx-auto p-6 gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Tus Workspaces</h1>
                    <p className="text-muted-foreground mt-1">Selecciona un espacio de trabajo para continuar</p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                    <Button
                        variant="default"
                        className="w-full md:w-auto gap-2 font-medium"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <Plus className="size-4" />
                        Nuevo Workspace
                    </Button>
                </div>
            </div>



            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Mail className="size-5 text-blue-500" />
                        <h2 className="text-lg font-semibold">
                            Invitaciones Pendientes
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({pendingInvitations.length})
                            </span>
                        </h2>
                    </div>

                    <div className="grid gap-3">
                        {pendingInvitations.map((invitation) => {
                            const wsInfo = getWorkspaceInfo(invitation.workspace_id);
                            const inviterInfo = getInviterInfo(invitation.invited_by);

                            return (
                                <div
                                    key={invitation.id}
                                    className="flex flex-row p-4 gap-4 rounded-xl border-2 border-blue-200 bg-blue-50/50"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="size-12 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden relative shadow-sm bg-gradient-to-br from-blue-600 to-purple-600">
                                            {wsInfo.name?.charAt(0).toUpperCase() || "W"}
                                        </div>
                                    </div>

                                    <div className="flex-grow min-w-0 ml-2 sm:ml-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <h3 className="text-sm sm:text-base font-bold sm:font-semibold text-foreground truncate">
                                                {wsInfo.name || "Workspace"}
                                            </h3>
                                            <span className="inline-block self-start text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                                                Invitación
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                                            <span className="hidden sm:inline">Invitado por </span><span className="font-medium text-foreground">{inviterInfo.first_name} {inviterInfo.last_name}</span>
                                        </p>
                                    </div>

                                    <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleRejectInvitation(invitation.id)}
                                            disabled={isPending && processingId === invitation.id}
                                        >
                                            <X className="size-4 mr-1" />
                                            Rechazar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => handleAcceptInvitation(invitation.id)}
                                            disabled={isPending && processingId === invitation.id}
                                        >
                                            <Check className="size-4 mr-1" />
                                            {isPending && processingId === invitation.id ? "Procesando..." : "Aceptar"}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Workspaces List */}
            <div className="flex flex-col gap-4">
                {pendingInvitations.length > 0 && (
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Boxes className="size-5" />
                        Mis Workspaces
                    </h2>
                )}

                <div className="grid gap-3">
                    {filteredWorkspaces.length > 0 ? (
                        filteredWorkspaces.map((workspace) => (
                            <div
                                key={workspace.id}
                                onClick={() => handleWorkspaceSelect(workspace.slug)}
                                className="group relative flex items-center p-3 sm:p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer overflow-hidden"
                            >
                                <div className="flex-shrink-0">
                                    <div className="size-12 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden relative shadow-sm transition-transform group-hover:scale-110 bg-gradient-to-br from-blue-600 to-purple-600">
                                        {workspace.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>

                                <div className="flex-grow min-w-0 ml-4 sm:ml-6">
                                    <h3 className="text-base sm:text-lg font-bold sm:font-semibold text-foreground truncate group-hover:text-blue-600 transition-colors">
                                        {workspace.name}
                                    </h3>
                                </div>

                                <div className="flex-shrink-0 ml-4 text-muted-foreground group-hover:text-foreground transition-colors">
                                    <ChevronRight className="size-5" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 border border-dashed border-border rounded-xl">
                            <div className="size-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Boxes className="size-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron workspaces</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                                {searchTerm ? "Intenta con otro término de búsqueda." : "Aún no eres miembro de ningún workspace."}
                            </p>
                            {!searchTerm && (
                                <Button
                                    variant="default"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Crear mi primer workspace
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <CreateWorkspaceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div >
    );
}
