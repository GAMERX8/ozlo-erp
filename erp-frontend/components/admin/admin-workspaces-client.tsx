"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminWorkspaces, deleteWorkspace } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Building2, Trash2, ExternalLink, Building2Icon } from "lucide-react";
import { toast } from "sonner";
import type { AdminWorkspace } from "@/lib/admin-actions";

type WorkspaceData = AdminWorkspace;

interface Props {
    initialData: {
        data: WorkspaceData[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
    currentPage: number;
    searchQuery?: string;
}

export function AdminWorkspacesClient({ initialData, currentPage, searchQuery }: Props) {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState(initialData.data);
    const [meta, setMeta] = useState(initialData.meta);
    const [search, setSearch] = useState(searchQuery || "");
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceData | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await getAdminWorkspaces({ page: 1, limit: 20, search });
        if (result.success && result.data) {
            setWorkspaces(result.data.data);
            setMeta(result.data.meta);
            router.push(`/admin/workspaces?${search ? `search=${search}` : ""}`);
        } else {
            toast.error(result.error || "Error al buscar workspaces");
        }
        setLoading(false);
    };

    const handlePageChange = async (page: number) => {
        setLoading(true);
        const result = await getAdminWorkspaces({ page, limit: 20, search });
        if (result.success && result.data) {
            setWorkspaces(result.data.data);
            setMeta(result.data.meta);
            router.push(`/admin/workspaces?page=${page}${search ? `&search=${search}` : ""}`);
        } else {
            toast.error(result.error || "Error al cargar workspaces");
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!workspaceToDelete) return;
        const result = await deleteWorkspace(workspaceToDelete.id);
        if (result.success) {
            setWorkspaces(workspaces.filter(w => w.id !== workspaceToDelete.id));
            toast.success("Workspace eliminado");
        } else {
            toast.error(result.error || "Error al eliminar workspace");
        }
        setDeleteDialogOpen(false);
        setWorkspaceToDelete(null);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building2Icon className="size-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Workspaces</h2>
                        <p className="text-muted-foreground">Gestiona los workspaces de la plataforma</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                <Input
                    placeholder="Buscar por nombre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:max-w-sm"
                />
                <Button type="submit" disabled={loading}>
                    <Search className="size-4 mr-2" />
                    Buscar
                </Button>
            </form>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <Table className="min-w-[820px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Workspace</TableHead>
<TableHead>Propietario</TableHead>
                                <TableHead>Miembros</TableHead>
                            <TableHead>Creado</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workspaces.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <Building2 className="mx-auto size-12 text-muted-foreground opacity-50" />
                                    <h3 className="mt-4 text-lg font-medium">No hay workspaces</h3>
                                    <p className="text-sm text-muted-foreground mt-1">No se encontraron workspaces.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            workspaces.map((workspace) => (
                            <TableRow key={workspace.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{workspace.name}</p>
                                            <p className="text-xs text-muted-foreground">{workspace.slug}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{workspace.owner?.email || '-'}</TableCell>
                                <TableCell>{workspace._count?.members || 0}</TableCell>
                                <TableCell>{new Date(workspace.date_created).toLocaleDateString('es-ES')}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/workspaces/${workspace.slug}`} target="_blank">
                                                    <ExternalLink className="size-4 mr-2" />
                                                    Ver workspace
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => {
                                                    setWorkspaceToDelete(workspace);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="size-4 mr-2" />
                                                Eliminar
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Mostrando {workspaces.length} de {meta.total} workspaces
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar workspace?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro? Se eliminará permanentemente el workspace &quot;{workspaceToDelete?.name}&quot;. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
