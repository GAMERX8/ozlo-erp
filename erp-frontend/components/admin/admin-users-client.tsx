"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminUsers, updateUserRole, deleteUser } from "@/lib/admin-actions";
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MoreHorizontal, Shield, User, Trash2, UserCog, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser } from "@/lib/admin-actions";

type UserData = AdminUser;

interface AdminUsersClientProps {
    initialData: {
        data: UserData[];
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

export function AdminUsersClient({ initialData, currentPage, searchQuery }: AdminUsersClientProps) {
    const router = useRouter();
    const [users, setUsers] = useState(initialData.data);
    const [meta, setMeta] = useState(initialData.meta);
    const [search, setSearch] = useState(searchQuery || "");
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await getAdminUsers({ page: 1, limit: 20, search });
        if (result.success && result.data) {
            setUsers(result.data.data);
            setMeta(result.data.meta);
            router.push(`/admin/users?${search ? `search=${search}` : ""}`);
        } else {
            toast.error(result.error || "Error al buscar usuarios");
        }
        setLoading(false);
    };

    const handlePageChange = async (page: number) => {
        setLoading(true);
        const result = await getAdminUsers({ page, limit: 20, search });
        if (result.success && result.data) {
            setUsers(result.data.data);
            setMeta(result.data.meta);
        } else {
            toast.error(result.error || "Error al cargar usuarios");
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        const result = await updateUserRole(userId, newRole);
        if (result.success) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast.success("Rol actualizado correctamente");
        } else {
            toast.error(result.error || "Error al actualizar rol");
        }
    };

    const handleDelete = async () => {
        if (!userToDelete) return;

        const result = await deleteUser(userToDelete.id);
        if (result.success) {
            setUsers(users.filter(u => u.id !== userToDelete.id));
            toast.success("Usuario eliminado correctamente");
        } else {
            toast.error(result.error || "Error al eliminar usuario");
        }
        setDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "super_admin":
                return <Badge variant="destructive">Super Admin</Badge>;
            default:
                return <Badge variant="secondary">Usuario</Badge>;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UsersIcon className="size-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
                        <p className="text-muted-foreground">
                            Gestiona los usuarios de la plataforma
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
                <Input
                    placeholder="Buscar por email, nombre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:max-w-sm"
                />
                <Button type="submit" disabled={loading}>
                    <Search className="size-4 mr-2" />
                    Buscar
                </Button>
            </form>

            {/* Users Table */}
            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <Table className="min-w-[860px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Workspaces</TableHead>
                            <TableHead>Verificado</TableHead>
                            <TableHead>Fecha de registro</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <UsersIcon className="mx-auto size-12 text-muted-foreground opacity-50" />
                                    <h3 className="mt-4 text-lg font-medium">No hay usuarios</h3>
                                    <p className="text-sm text-muted-foreground mt-1">No se encontraron usuarios.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8">
                                            <AvatarFallback>
                                                {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                <TableCell>
                                    {user._count?.workspaces || 0} propios, {user._count?.workspaceMembers || 0} miembro
                                </TableCell>
                                <TableCell>
                                    {user.email_verified === true ? (
                                        <Badge variant="default">
                                            Verificado
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">
                                            Pendiente
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {new Date(user.date_created).toLocaleDateString('es-ES')}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/users/${user.id}`}>
                                                    <User className="size-4 mr-2" />
                                                    Ver detalles
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Cambiar rol</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                                                <User className="size-4 mr-2" />
                                                Usuario
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, "super_admin")}>
                                                <UserCog className="size-4 mr-2" />
                                                Super Admin
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => {
                                                    setUserToDelete(user);
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

            {/* Pagination */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    Mostrando {users.length} de {meta.total} usuarios
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

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro? Se eliminará permanentemente el usuario {userToDelete && `"${userToDelete.email}"`}. Esta acción no se puede deshacer.
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
