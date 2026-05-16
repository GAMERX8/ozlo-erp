"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, LayoutGrid, ArrowLeft } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/clients-actions";

export default function CategoriesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const workspaceId = workspace?.id;

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getCategories(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  const filteredCategories = categories?.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (editingCategory) {
        const result = await updateCategory(workspaceId, editingCategory.id, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      } else {
        const result = await createCategory(workspaceId, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }
    },
    onSuccess: () => {
      toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["categories", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !deletingCategory) throw new Error("Datos incompletos");
      const result = await deleteCategory(workspaceId, deletingCategory.id);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Categoría eliminada");
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      queryClient.invalidateQueries({ queryKey: ["categories", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingCategory(null);
  };

  const openEditModal = (category: any) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || "" });
    setIsModalOpen(true);
  };

  const openDeleteModal = (category: any) => {
    setDeletingCategory(category);
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
          <LayoutGrid className="mx-auto size-12 text-muted-foreground opacity-50" />
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
          <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organiza tus productos en categorías.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorías..."
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
              <TableHead>Descripción</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoriesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <LayoutGrid className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">
                    {searchTerm ? "No hay resultados" : "No hay categorías"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Intenta con otro término de búsqueda." : "Crea tu primera categoría para organizar tus productos."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category: any) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{category._count?.products ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(category)}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteModal(category)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Actualiza la información de la categoría." : "Completa los datos para crear una nueva categoría."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Electrónicos"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional de la categoría"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!formData.name || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Categoría</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la categoría &quot;{deletingCategory?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}