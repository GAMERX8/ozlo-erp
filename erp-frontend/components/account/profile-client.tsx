"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, UserProfile } from "@/lib/profile-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Save, Building2, Crown, Users, MailOpen, Check, X } from "lucide-react";
import { acceptInvitation, rejectInvitation } from "@/lib/invitation-actions";
import type { WorkspaceInvitation } from "@/types";
import { toast } from "sonner";
import { SecurityCard } from "./security-card";
import { MfaCard } from "./mfa-card";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
    members?: any[];
}

interface ProfileClientProps {
    profile: UserProfile;
    workspaces: Workspace[];
    invitations: WorkspaceInvitation[];
    provider?: string;
}

export function ProfileClient({ profile, workspaces, invitations, provider }: ProfileClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleAcceptInvitation = async (invitationId: string) => {
        startTransition(async () => {
            const result = await acceptInvitation(invitationId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invitación aceptada");
                router.refresh();
            }
        });
    };

    const handleRejectInvitation = async (invitationId: string) => {
        startTransition(async () => {
            const result = await rejectInvitation(invitationId);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Invitación rechazada");
                router.refresh();
            }
        });
    };

    const [formData, setFormData] = useState({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
		}));
    };

    const handleSaveProfile = async () => {
        startTransition(async () => {
            const result = await updateProfile(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Perfil actualizado exitosamente");
                router.refresh();
            }
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mi Cuenta</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Administra tu información personal y configuración de seguridad
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">

                {/* Profile Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Información Personal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="first_name">Nombre</Label>
                                <Input
                                    id="first_name"
                                    name="first_name"
                                    placeholder="Tu nombre"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="last_name">Apellido</Label>
                                <Input
                                    id="last_name"
                                    name="last_name"
                                    placeholder="Tu apellido"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Email (Read only) */}
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={profile.email}
                                    className="pl-10 bg-muted/50"
                                    disabled
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                El email no se puede cambiar por seguridad
                            </p>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isPending}
                                className="gap-2"
                            >
                                {isPending ? <Save className="size-4 animate-spin" /> : <Save className="size-4" />}
                                {isPending ? "Guardando..." : "Guardar cambios"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Invitations Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Invitaciones Pendientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invitations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No tienes invitaciones pendientes.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {invitations.map((invitation) => {
                                    const workspace = typeof invitation.workspace_id === 'object' ? invitation.workspace_id : invitation.workspace;
                                    const inviter = typeof invitation.invited_by === 'object' ? invitation.invited_by : invitation.invited_by_user;
                                    const inviterName = inviter 
                                        ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email 
                                        : 'alguien';
                                    return (
                                        <div
                                            key={invitation.id}
                                            className="flex items-center justify-between p-3 rounded-lg border"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                    <MailOpen className="size-5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{workspace?.name || 'Workspace'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Invitado por {inviterName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRejectInvitation(invitation.id)}
                                                    disabled={isPending}
                                                >
                                                    <X className="size-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAcceptInvitation(invitation.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Workspaces Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Mis Workspaces
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {workspaces.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No tienes workspaces aún.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {workspaces.map((workspace) => {
                                    const isOwner = workspace.owner_id === profile.id;
                                    return (
                                        <Link
                                            key={workspace.id}
                                            href={`/workspaces/${workspace.slug}`}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building2 className="size-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{workspace.name}</p>
                                                    <p className="text-xs text-muted-foreground">/{workspace.slug}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isOwner ? (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <Crown className="size-3" />
                                                        Owner
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Users className="size-3" />
                                                        Miembro
                                                    </Badge>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Security Card */}
                <SecurityCard provider={provider} />

                {/* MFA Card */}
                <MfaCard mfaEnabled={!!profile.mfa_enabled} />
            </div>

        </div>
    );
}
