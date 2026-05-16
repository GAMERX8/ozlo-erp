"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Mail, Loader2, Crown, Trash2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Workspace, removeWorkspaceMemberWithSlug } from "@/lib/workspace-actions";
import { sendInvitation, cancelInvitation } from "@/lib/invitation-actions";
import type { WorkspaceInvitation } from "@/types";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_DESCRIPTIONS, getRoleBadgeVariant } from "@/lib/permissions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface WorkspaceMembersProps {
    workspace: Workspace;
    pendingInvitations: WorkspaceInvitation[];
    currentUserId: string;
    currentUserEmail: string;
}

export function WorkspaceMembers({
    workspace,
    pendingInvitations: initialPendingInvitations,
    currentUserId,
}: WorkspaceMembersProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<string>("member");
    const [memberToDelete, setMemberToDelete] = useState<any>(null);
    const [invitationToCancel, setInvitationToCancel] = useState<any>(null);
    const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations);

    const { canInvite, canRemoveMembers, canPromoteToAdmin, isOwner, isAdmin } = usePermissions(workspace);

    const owner = typeof workspace.owner === 'object' ? workspace.owner : null;
    const members = workspace.members || [];

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error("Ingresa un email válido");
            return;
        }

        setIsLoading(true);
        const result = await sendInvitation(workspace.id, inviteEmail.trim(), workspace.slug, inviteRole);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Invitación enviada exitosamente");
            setInviteEmail("");
            setInviteRole("member");
            setIsInviteOpen(false);
            router.refresh();
        }
        setIsLoading(false);
    };

    const handleRemoveMember = async () => {
        if (!memberToDelete) return;
        setIsLoading(true);
        const result = await removeWorkspaceMemberWithSlug(memberToDelete.id, workspace.slug);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Miembro eliminado exitosamente");
            setMemberToDelete(null);
            router.refresh();
        }
        setIsLoading(false);
    };

    const handleCancelInvitation = async () => {
        if (!invitationToCancel) return;
        setIsLoading(true);
        const result = await cancelInvitation(invitationToCancel.id, workspace.slug);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Invitación cancelada");
            setInvitationToCancel(null);
            router.refresh();
        }
        setIsLoading(false);
    };

    const getMemberInfo = (member: any) => {
        const user = member.user || (typeof member.user_id === 'object' ? member.user_id : null);
        return {
            id: user?.id || member.user_id,
            name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre' : 'Usuario',
            email: user?.email || 'Sin email',
            initials: user?.first_name?.[0]?.toUpperCase() || 'U',
        };
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7) return `hace ${diffDays}d`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gestiona quién tiene acceso a <span className="font-medium">{workspace.name}</span>
                    </p>
                </div>
                {canInvite && (
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Users className="size-4" />
                                Invitar Miembro
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invitar nuevo miembro</DialogTitle>
                                <DialogDescription>
                                    Ingresa el email y selecciona el rol para el nuevo miembro.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col py-4 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="email">Email del usuario</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="usuario@ejemplo.com"
                                            className="pl-10"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="role">Rol</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">
                                                <div className="flex flex-col items-start">
                                                    <span>{ROLE_DESCRIPTIONS.member.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {ROLE_DESCRIPTIONS.member.description}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                            {canPromoteToAdmin && (
                                                <SelectItem value="admin">
                                                    <div className="flex flex-col items-start">
                                                        <span>{ROLE_DESCRIPTIONS.admin.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {ROLE_DESCRIPTIONS.admin.description}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleInvite} disabled={isLoading}>
                                    {isLoading ? "Enviando..." : "Enviar Invitación"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Members List */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-right">Rol</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Owner */}
                        <TableRow>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="size-9 bg-amber-500 rounded-full flex items-center justify-center font-bold text-xs text-white">
                                        {owner?.first_name?.[0]?.toUpperCase() || "O"}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {owner ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() : 'Propietario'}
                                            </span>
                                            {owner?.id === currentUserId && (
                                                <Badge variant="secondary" className="text-[10px] font-bold">Tú</Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{owner?.email}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant="secondary" className="gap-1.5">
                                    <Crown className="size-3.5" />
                                    Propietario
                                </Badge>
                            </TableCell>
                        </TableRow>

                        {/* Members */}
                        {members.map((member) => {
                            const info = getMemberInfo(member);
                            const isCurrentUser = info.id === currentUserId;
                            const memberRole = member.role as 'admin' | 'member';
                            const canRemove = canRemoveMembers && !isCurrentUser && member.user_id !== workspace.owner_id;

                            return (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 bg-muted rounded-full flex items-center justify-center font-bold text-xs text-muted-foreground border">
                                                {info.initials}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{info.name}</span>
                                                    {isCurrentUser && (
                                                        <Badge variant="secondary" className="text-[10px] font-bold">Tú</Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">{info.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge variant={getRoleBadgeVariant(memberRole)}>
                                                {ROLE_DESCRIPTIONS[memberRole].name}
                                            </Badge>
                                            {canRemove && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => setMemberToDelete(member)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="size-4" />
                            Invitaciones pendientes ({pendingInvitations.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {pendingInvitations.map((invitation) => {
                            const invitedUser = typeof invitation.invited_user_id === 'object' ? invitation.invited_user_id : null;
                            const userName = invitedUser ? `${invitedUser.first_name || ''} ${invitedUser.last_name || ''}`.trim() || invitedUser.email : (invitation.email || 'Usuario invitado');
                            return (
                                <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 bg-muted rounded-full flex items-center justify-center">
                                            <Mail className="size-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{userName}</p>
                                            <p className="text-xs text-muted-foreground">Enviada {formatDate(invitation.date_created)}</p>
                                        </div>
                                    </div>
                                    {canRemoveMembers && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setInvitationToCancel(invitation)}
                                        >
                                            <X className="size-4 mr-1" />
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Delete Member Dialog */}
            <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará a {memberToDelete ? getMemberInfo(memberToDelete).name : ''} del workspace.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground">
                            {isLoading ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Cancel Invitation Dialog */}
            <AlertDialog open={!!invitationToCancel} onOpenChange={(open) => !open && setInvitationToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cancelar invitación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción cancelará la invitación enviada a {' '}
                            {invitationToCancel?.invited_user_id
                                ? `${invitationToCancel.invited_user_id.first_name || ''} ${invitationToCancel.invited_user_id.last_name || ''}`.trim() || invitationToCancel.invited_user_id.email
                                : ''}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Mantener</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelInvitation} className="bg-destructive text-destructive-foreground">
                            {isLoading ? "Cancelando..." : "Cancelar invitación"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
