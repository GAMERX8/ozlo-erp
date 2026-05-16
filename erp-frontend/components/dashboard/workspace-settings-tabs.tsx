"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Settings, Users, Receipt, Mail, Loader2, Crown, Trash2, UserPlus, Clock, X, CheckCircle2, AlertCircle, Calendar, Bot, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Workspace, updateWorkspace, removeWorkspaceMemberWithSlug, deleteWorkspace } from "@/lib/workspace-actions";
import { sendInvitation, cancelInvitation } from "@/lib/invitation-actions";
import type { WorkspaceInvitation } from "@/types";
import { BillingPortalButton } from "@/components/subscription/billing-portal-button";
import { WorkspaceBillingStatus } from "@/components/billing/workspace-billing-status";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_DESCRIPTIONS, getRoleBadgeVariant } from "@/lib/permissions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface WorkspaceSettingsTabsProps {
    workspace: Workspace;
    pendingInvitations: WorkspaceInvitation[];
    currentUserId: string;
    currentUserEmail: string;

    searchParams: { success?: string; canceled?: string };
}

export function WorkspaceSettingsTabs({
    workspace,
    pendingInvitations: initialPendingInvitations,
    currentUserId,
    currentUserEmail,

    searchParams,
}: WorkspaceSettingsTabsProps) {
    const router = useRouter();
    const urlSearchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("general");
    const [isLoading, setIsLoading] = useState(false);

    // Read tab from URL on mount
    useEffect(() => {
        const tabFromUrl = urlSearchParams.get("tab");
        if (tabFromUrl && ["general", "members", "billing"].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [urlSearchParams]);

    // Handle tab change with URL update
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Update URL without page reload
        const params = new URLSearchParams(urlSearchParams.toString());
        params.set("tab", value);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    // General settings state
    const [formData, setFormData] = useState({
        name: workspace.name,
        phone: workspace.phone || "",
        website: workspace.website || "",
    });

    // Members state
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<string>("member");
    const [memberToDelete, setMemberToDelete] = useState<any>(null);
    const [invitationToCancel, setInvitationToCancel] = useState<any>(null);
    const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations);

    // Permissions
    const { canInvite, canRemoveMembers, canChangeRoles, canPromoteToAdmin, canManageBilling, canDeleteWorkspace, isOwner, isAdmin, displayRole } = usePermissions(workspace);

    // Delete workspace state
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const owner = typeof workspace.owner === 'object' ? workspace.owner : null;
    const members = workspace.members || [];

    // Handlers
    const handleSaveGeneral = async () => {
        setIsLoading(true);
        const result = await updateWorkspace(workspace.id, {
            name: formData.name,
            phone: formData.phone,
            website: formData.website,
        });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Configuración actualizada");
            router.refresh();
        }
        setIsLoading(false);
    };

    const handleDeleteWorkspace = async () => {
        if (deleteConfirmation !== workspace.name) {
            toast.error("El nombre no coincide");
            return;
        }

        setIsDeleting(true);
        const result = await deleteWorkspace(workspace.id);

        if (result.error) {
            toast.error(result.error);
            setIsDeleting(false);
        } else {
            toast.success("Workspace eliminado permanentemente");
            router.push("/workspaces");
        }
    };

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

    // Helpers
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

    const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
        if (cancelAtPeriodEnd) {
            return <Badge variant="secondary">Cancelando</Badge>;
        }
        switch (status) {
            case 'active':
            case 'trialing':
                return <Badge variant="default">Activo</Badge>;
            case 'past_due':
                return <Badge variant="destructive">Pago pendiente</Badge>;
            case 'canceled':
                return <Badge variant="outline">Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const success = searchParams.success === 'true';
    const canceled = searchParams.canceled === 'true';

    return (
        <div className="flex flex-col animate-in fade-in duration-500 pb-12 gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Gestiona los ajustes de <span className="font-medium">{workspace.name}</span>
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="general" className="gap-2">
                        <Settings className="size-4" />
                        <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                    <TabsTrigger value="members" className="gap-2">
                        <Users className="size-4" />
                        <span className="hidden sm:inline">Miembros</span>
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="gap-2">
                        <Receipt className="size-4" />
                        <span className="hidden sm:inline">Facturación</span>
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="flex flex-col gap-6">
                    <div>
                        <h2 className="text-xl font-semibold">Información General</h2>
                        <p className="text-sm text-muted-foreground">
                            Administra la información básica de tu workspace
                        </p>
                    </div>

                    <Card className="max-w-4xl">
                        <CardContent className="flex flex-col p-6 gap-8">
                            <div className="flex flex-col gap-4">
                                <Label htmlFor="name">Nombre del Workspace</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    disabled={!isAdmin}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <PhoneInput
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value || "" }))}
                                    disabled={!isAdmin}
                                    defaultCountry="PE"
                                    placeholder="Ingresa tu número de teléfono"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor="website">Sitio Web</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    placeholder="https://ejemplo.com"
                                    value={formData.website}
                                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                                    disabled={!isAdmin}
                                />
                            </div>

                            {isAdmin && (
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleSaveGeneral} disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                        Guardar cambios
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Zona de Peligro - Solo para Owner */}
                    {canDeleteWorkspace && (
                        <Card className="max-w-4xl border-destructive/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <AlertTriangle className="size-5" />
                                    Zona de Peligro
                                </CardTitle>
                                <CardDescription>
                                    Eliminar este proyecto es una acción permanente que elimina los datos, 
                                    los registros, las configuraciones y los recursos relacionados del proyecto.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="gap-2"
                                >
                                    <Trash2 className="size-4" />
                                    Eliminar Proyecto
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Members Tab */}
                <TabsContent value="members" className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">Miembros del equipo</h2>
                            <p className="text-sm text-muted-foreground">
                                Gestiona quién tiene acceso a este workspace
                            </p>
                        </div>
                        {canInvite && (
                            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2">
                                        <UserPlus className="size-4" />
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
                    <Card className="overflow-hidden p-0">
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
                    </Card>

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
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="flex flex-col gap-6">
                    {/* Stripe Messages */}
                    {success && (
                        <Alert>
                            <CheckCircle2 className="size-4" />
                            <AlertTitle>¡Pago completado!</AlertTitle>
                            <AlertDescription>
                                Tu suscripción está activa.
                            </AlertDescription>
                        </Alert>
                    )}
                    {canceled && (
                        <Alert>
                            <AlertCircle className="size-4" />
                            <AlertTitle>Pago cancelado</AlertTitle>
                            <AlertDescription>
                                El proceso de pago fue cancelado.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div>
                        <h2 className="text-xl font-semibold">Plan Actual</h2>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tu suscripción y límites
                        </p>
                    </div>

                    {canManageBilling ? (
                        <WorkspaceBillingStatus
                            workspaceId={workspace.id}
                            workspaceSlug={workspace.slug}
                        />
                    ) : (
                        <Card>
                            <CardContent className="py-10 text-center">
                                <AlertCircle className="size-10 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-muted-foreground font-medium">Solo administradores pueden gestionar la facturación.</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

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

            {/* Delete Workspace Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            ¿Eliminar proyecto permanentemente?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="flex flex-col text-sm text-muted-foreground gap-4">
                                <p>
                                    Esta acción <strong>NO se puede deshacer</strong>. Esto eliminará permanentemente:
                                </p>
                                <ul className="flex flex-col list-disc list-inside gap-1">
                                    <li>Todas las instancias del proyecto</li>
                                    <li>Todos los miembros y sus roles</li>
                                    <li>Todos los registros de auditoría</li>
                                    <li>Configuraciones de billing y suscripciones</li>
                                </ul>
                                <div className="flex flex-col pt-4 gap-2">
                                    <p className="font-medium">
                                        Escribe <code className="bg-muted px-1 py-0.5 rounded">{workspace.name}</code> para confirmar:
                                    </p>
                                    <Input
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder={`Escribe "${workspace.name}" para confirmar`}
                                        className="border-destructive/50 focus-visible:ring-destructive"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDeleteConfirmation("");
                            setShowDeleteDialog(false);
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteWorkspace}
                            disabled={deleteConfirmation !== workspace.name || isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 size-4" />
                                    Eliminar Permanentemente
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
