"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Warehouse, MapPin, ArrowLeft } from "lucide-react";
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "@/lib/clients-actions";

export default function WarehousesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [deletingWarehouse, setDeletingWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", address: "" });
  const workspaceId = workspace?.id;

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getWarehouses(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  const filteredWarehouses = warehouses?.filter((w: any) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.address && w.address.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (editingWarehouse) {
        const result = await updateWarehouse(workspaceId, editingWarehouse.id, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      } else {
        const result = await createWarehouse(workspaceId, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }
    },
    onSuccess: () => {
      toast.success(editingWarehouse ? "Almacén actualizado" : "Almacén creado");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["warehouses", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !deletingWarehouse) throw new Error("Datos incompletos");
      const result = await deleteWarehouse(workspaceId, deletingWarehouse.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Almacén desactivado");
      setIsDeleteModalOpen(false);
      setDeletingWarehouse(null);
      queryClient.invalidateQueries({ queryKey: ["warehouses", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const resetForm = () => {
    setFormData({ name: "", address: "" });
    setEditingWarehouse(null);
  };

  const openEditModal = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setFormData({ name: warehouse.name, address: warehouse.address || "" });
    setIsModalOpen(true);
  };

  const openDeleteModal = (warehouse: any) => {
    setDeletingWarehouse(warehouse);
    setIsDeleteModalOpen(true);
  };

  if (workspaceLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="text-center py-12">
          <Warehouse className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground hover:text-foreground">
          <Link href={`/workspaces/${slug}/products`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Regresar al Catálogo
          </Link>
        </Button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Almacenes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus almacenes y ubicaciones de stock.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Almacén
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar almacenes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehousesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredWarehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <Warehouse className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">
                    {searchTerm ? "No hay resultados" : "No hay almacenes"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Intenta con otro término de búsqueda." : "Agrega tu primer almacén para gestionar el stock por ubicación."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredWarehouses.map((warehouse: any) => (
                <TableRow key={warehouse.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{warehouse.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {warehouse.address ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{warehouse.address}</span>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                      {warehouse.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(warehouse)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteModal(warehouse)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Desactivar
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Editar Almacén" : "Nuevo Almacén"}</DialogTitle>
            <DialogDescription>
              {editingWarehouse ? "Actualiza la información del almacén." : "Completa los datos para crear un nuevo almacén."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Almacén Central"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Dirección</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ej. Av. Principal 123, Lima"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingWarehouse ? "Guardar Cambios" : "Crear Almacén"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar Almacén</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de desactivar el almacén &quot;{deletingWarehouse?.name}&quot;? Los productos asociados no se eliminarán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}