"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { getAuditLogs, type AuditLog } from "@/lib/admin-actions";

interface Props {
    initialData: {
        data: AuditLog[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
        actions: string[];
    };
    currentPage: number;
    actionFilter?: string;
}

const actionLabels: Record<string, string> = {
    USER_LOGIN: "Inicio de sesión",
    USER_LOGOUT: "Cierre de sesión",
    USER_REGISTERED: "Registro de usuario",
    USER_PASSWORD_CHANGED: "Cambio de contraseña",
    USER_PASSWORD_RESET: "Restablecimiento de contraseña",
    USER_EMAIL_VERIFIED: "Email verificado",
    USER_MFA_ENABLED: "MFA activado",
    USER_MFA_DISABLED: "MFA desactivado",
    USER_PROFILE_UPDATED: "Perfil actualizado",
    WORKSPACE_CREATED: "Workspace creado",
    WORKSPACE_UPDATED: "Workspace actualizado",
    WORKSPACE_DELETED: "Workspace eliminado",
    MEMBER_INVITED: "Miembro invitado",
    MEMBER_INVITATION_ACCEPTED: "Invitación aceptada",
    MEMBER_INVITATION_REJECTED: "Invitación rechazada",
    MEMBER_INVITATION_CANCELED: "Invitación cancelada",
    MEMBER_REMOVED: "Miembro eliminado",
    MEMBER_LEFT: "Miembro salió",
    SUBSCRIPTION_CREATED: "Suscripción creada",
    SUBSCRIPTION_UPDATED: "Suscripción actualizada",
    SUBSCRIPTION_CANCELED: "Suscripción cancelada",
    SUBSCRIPTION_RENEWED: "Suscripción renovada",
    PAYMENT_SUCCEEDED: "Pago exitoso",
    PAYMENT_FAILED: "Pago fallido",
};

export function AuditLogsClient({
    initialData,
    currentPage,
    actionFilter,
}: Props) {
    const router = useRouter();
    const [logs, setLogs] = useState(initialData.data);
    const [meta, setMeta] = useState(initialData.meta);
    const [page, setPage] = useState(currentPage);
    const [action, setAction] = useState(actionFilter || "all");
    const [actions] = useState(initialData.actions);
    const [loading, setLoading] = useState(false);

    const fetchData = async (currentPage: number, currentAction: string) => {
        setLoading(true);
        const result = await getAuditLogs({
            offset: (currentPage - 1) * 20,
            limit: 20,
            action: currentAction === "all" ? undefined : currentAction,
        });
        if (result.success && result.data) {
            setLogs(result.data.logs || []);
            setMeta({
                total: result.data.total || 0,
                page: currentPage,
                limit: 20,
                totalPages: Math.ceil((result.data.total || 0) / 20),
            });
        } else {
            toast.error(result.error || "Error al cargar logs");
        }
        setLoading(false);
    };

    const handleActionChange = (newAction: string) => {
        setAction(newAction);
        fetchData(1, newAction);
        const params = new URLSearchParams();
        if (newAction !== "all") params.set("action", newAction);
        router.push(`/admin/audit-logs?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        fetchData(newPage, action);
        const params = new URLSearchParams();
        params.set("page", newPage.toString());
        if (action !== "all") params.set("action", action);
        router.push(`/admin/audit-logs?${params.toString()}`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ClipboardList className="size-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Registros de Auditoría</h2>
                        <p className="text-muted-foreground">
                            Supervisa el registro de actividad del sistema
                        </p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={action} onValueChange={handleActionChange} disabled={loading}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Filtrar por acción" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las acciones</SelectItem>
                        {actions.map((action) => (
                            <SelectItem key={action} value={action}>
                                {actionLabels[action] || action}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={() => fetchData(page, action)} disabled={loading}>
                    <Search className="size-4 mr-2" />
                    Buscar
                </Button>
            </div>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Entidad</TableHead>
                            <TableHead>Workspace</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <ClipboardList className="mx-auto size-12 text-muted-foreground opacity-50" />
                                    <h3 className="mt-4 text-lg font-medium">No hay registros</h3>
                                    <p className="text-sm text-muted-foreground mt-1">No se encontraron registros de auditoría.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {formatDate(log.created_at || log.date_created || '')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {actionLabels[log.action] || log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {log.actor ? (
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-8">
                                                    <AvatarFallback>
                                                        {(log.actor.first_name?.[0] || log.actor.email[0]).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">
                                                        {log.actor.first_name} {log.actor.last_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {log.actor.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Sistema</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div className="capitalize">{log.entity_type}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {log.workspace ? (
                                            <p className="text-sm">{log.workspace.name}</p>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-mono text-muted-foreground">{log.ip_address || "-"}</span>
                                    </TableCell>
                                    <TableCell>
                                        {log.success ? (
                                            <Badge variant="default">
                                                Éxito
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                Error
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Mostrando {logs.length} de {meta.total} registros
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(meta.page - 1)}
                        disabled={meta.page <= 1 || loading}
                    >
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(meta.page + 1)}
                        disabled={meta.page >= meta.totalPages || loading}
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
        </div>
    );
}
