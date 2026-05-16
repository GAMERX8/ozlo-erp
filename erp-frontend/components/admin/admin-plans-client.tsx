"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminActivePlans, updatePlanStatus } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, ExternalLink, CreditCardIcon, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AdminPlan } from "@/lib/admin-actions";

type PlanData = AdminPlan;

interface Props {
    initialData: {
        data: PlanData[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
    currentPage: number;
    statusFilter?: string;
}

const statusLabels: Record<string, string> = {
    active: "Activo",
    pending: "Pendiente",
    past_due: "Pago vencido",
    canceled: "Cancelado",
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case "active":
            return <Badge variant="default">{statusLabels[status]}</Badge>;
        case "pending":
            return <Badge variant="secondary">{statusLabels[status]}</Badge>;
        case "past_due":
            return <Badge variant="destructive">{statusLabels[status]}</Badge>;
        case "canceled":
            return <Badge variant="outline">{statusLabels[status]}</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

export function AdminPlansClient({ initialData, currentPage, statusFilter }: Props) {
    const router = useRouter();
    const [plans, setPlans] = useState(initialData.data);
    const [meta, setMeta] = useState(initialData.meta);
    const [status, setStatus] = useState(statusFilter || "all");
    const [loading, setLoading] = useState(false);

    const fetchData = async (page: number, currentStatus: string) => {
        setLoading(true);
        try {
            const result = await getAdminActivePlans({
                page,
                limit: 20,
                status: currentStatus === "all" ? undefined : currentStatus,
            });
            if (result.success && result.data) {
                setPlans(result.data.plans);
                setMeta({
                    total: result.data.total,
                    page: result.data.page,
                    limit: result.data.limit,
                    totalPages: Math.max(1, Math.ceil(result.data.total / result.data.limit))
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        fetchData(1, newStatus);
        const params = new URLSearchParams();
        if (newStatus !== "all") params.set("status", newStatus);
        router.push(`/admin/plans?${params.toString()}`);
    };

    const handlePageChange = (page: number) => {
        fetchData(page, status);
        const params = new URLSearchParams();
        params.set("page", page.toString());
        if (status !== "all") params.set("status", status);
        router.push(`/admin/plans?${params.toString()}`);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const result = await updatePlanStatus(id, newStatus);
        if (result.success) {
            setPlans(plans.map(p => p.id === id ? { ...p, status: newStatus } : p));
            toast.success("Estado actualizado correctamente");
        } else {
            toast.error(result.error || "Error al actualizar estado");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CreditCardIcon className="size-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Suscripciones</h2>
                        <p className="text-muted-foreground">
                            Gestiona los planes y suscripciones de los workspaces
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
                <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="past_due">Pago vencido</SelectItem>
                        <SelectItem value="canceled">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Plans Table */}
            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Workspace</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Propietario</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12">
                                    <CreditCard className="mx-auto size-12 text-muted-foreground opacity-50" />
                                    <h3 className="mt-4 text-lg font-medium">No hay suscripciones</h3>
                                    <p className="text-sm text-muted-foreground mt-1">No se encontraron suscripciones activas.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-medium">{plan.name}</p>
                                        <p className="text-xs text-muted-foreground">{plan.slug}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {plan.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(plan.status)}
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm">{plan.owner?.email || '-'}</p>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/plans/${plan.id}`}>
                                                    <ExternalLink className="size-4 mr-2" />
                                                    Ver detalles
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                </Table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Mostrando {plans.length} de {meta.total} planes
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
