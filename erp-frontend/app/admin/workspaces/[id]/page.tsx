import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminWorkspaceById } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Building2,
    Users,
    Mail,
    Calendar,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Detalle de Workspace - Admin - ${APP_NAME}`,
};

interface AdminWorkspaceDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminWorkspaceDetailPage({ params }: AdminWorkspaceDetailPageProps) {
    const { id } = await params;
    
    const workspaceResult = await getAdminWorkspaceById(id);
    
    if (!workspaceResult.success || !workspaceResult.data) {
        notFound();
    }
    
    const workspace = workspaceResult.data as any;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/workspaces">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Detalles del Workspace</h2>
                    <p className="text-muted-foreground">
                        Información completa del workspace
                    </p>
                </div>
            </div>

            {/* Workspace Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="size-5" />
                        {workspace.name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <span className="text-muted-foreground">ID:</span>
                            <p className="font-mono">{workspace.id}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Slug:</span>
                            <p>{workspace.slug}</p>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Propietario:</span>
                            <div className="flex items-center gap-2">
                                <Mail className="size-4" />
                                <Button variant="link" className="p-0 h-auto" asChild>
                                    <Link href={`/admin/users/${workspace.owner.id}`}>
                                        {workspace.owner.email}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Creado:</span>
                            <p>{new Date(workspace.date_created).toLocaleString('es-ES')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" />
                        Miembros
                        <Badge variant="secondary">{workspace._count?.members || 0}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {workspace.members?.length === 0 ? (
                        <div className="text-center py-4">
                            <Users className="mx-auto size-8 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground mt-2">No se encontraron miembros</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {workspace.members?.map((member: any) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{member.user.email}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/admin/users/${member.user.id}`}>
                                            Ver usuario
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            </div>
    );
}
