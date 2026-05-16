import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminUserById } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Mail,
    Shield,
    User,
    CheckCircle,
    XCircle,
    Building2,
    Users,
    Calendar,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Detalle de Usuario - Admin - ${APP_NAME}`,
};

interface AdminUserDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
    const { id } = await params;
    
    const userResult = await getAdminUserById(id);
    
    if (!userResult.success || !userResult.data) {
        notFound();
    }
    
    const user = userResult.data as any;

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "super_admin":
                return <Badge variant="destructive">Super Admin</Badge>;
            default:
                return <Badge variant="secondary">Usuario</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge variant="default">Activo</Badge>;
            case "draft":
                return <Badge variant="secondary">Borrador</Badge>;
            case "suspended":
                return <Badge variant="destructive">Suspendido</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getSubscriptionStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge variant="default">Activa</Badge>;
            case "canceled":
                return <Badge variant="outline">Cancelada</Badge>;
            case "past_due":
                return <Badge variant="destructive">Pago pendiente</Badge>;
            case "unpaid":
                return <Badge variant="destructive">No pagada</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Detalles del Usuario</h2>
                    <p className="text-muted-foreground">
                        Información completa del usuario
                    </p>
                </div>
            </div>

            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Información del Usuario</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                        <Avatar className="size-20">
                            <AvatarFallback className="text-2xl">
                                {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 gap-1">
                            <h3 className="text-2xl font-semibold">
                                {user.first_name} {user.last_name}
                            </h3>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="size-4" />
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                {getRoleBadge(user.role)}
                                {user.email_verified ? (
                                    <Badge variant="default">
                                        <CheckCircle className="size-3 mr-1" />
                                        Verificado
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        <XCircle className="size-3 mr-1" />
                                        Pendiente
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <span className="text-muted-foreground">ID:</span>
                            <p className="font-mono">{user.id}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Fecha de registro:</span>
                            <p>{new Date(user.date_created).toLocaleString('es-ES')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Workspaces Section */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Owned Workspaces */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="size-5" />
                            Workspaces Propios
                            <Badge variant="secondary">{user.workspaces.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {user.workspaces.length === 0 ? (
                            <div className="text-center py-4">
                                <Building2 className="mx-auto size-8 text-muted-foreground opacity-50" />
                                <p className="text-sm text-muted-foreground mt-2">No se encontraron workspaces propios</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {user.workspaces.map((workspace: any) => (
                                    <div
                                        key={workspace.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{workspace.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {workspace._count.members} miembros
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/workspaces/${workspace.id}`}>
                                                Ver
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Member Workspaces */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" />
                            Miembro de
                            <Badge variant="secondary">{user.workspaceMembers.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {user.workspaceMembers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No es miembro de ningún workspace
                            </p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {user.workspaceMembers.map((membership: any) => (
                                    <div
                                        key={membership.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{membership.workspace.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Propietario: {membership.workspace.owner.email}
                                            </p>
                                            <Badge variant="secondary" className="mt-1">
                                                {membership.role}
                                            </Badge>
                                        </div>
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/workspaces/${membership.workspace.id}`}>
                                                Ver
                                            </Link>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            
        </div>
    );
}
