"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, Phone, Mail, Edit, Trash2, Loader2, Building2, Globe, MapPin, User, FileText, CheckCircle, Wallet, Clock } from "lucide-react";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "@/lib/suppliers-actions";

export default function SuppliersPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    contact_name: "", 
    email: "", 
    phone: "", 
    document_type: "RUC", 
    document_number: "", 
    address: ""
  });
  
  const workspaceId = workspace?.id;

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers", workspaceId, searchTerm],
    queryFn: async () => { 
      if (!workspaceId) return []; 
      const result = await getSuppliers(workspaceId, searchTerm); 
      if (!result.success) throw new Error(result.error); 
      return result.data || []; 
    },
    enabled: !!workspaceId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (editingSupplier) { 
        const result = await updateSupplier(editingSupplier.id, workspaceId, formData); 
        if (!result.success) throw new Error(result.error); 
        return result.data; 
      } else { 
        const result = await createSupplier(workspaceId, formData); 
        if (!result.success) throw new Error(result.error); 
        return result.data; 
      }
    },
    onSuccess: () => { 
      toast.success(editingSupplier ? "Proveedor actualizado" : "Proveedor creado"); 
      setIsModalOpen(false); 
      resetForm(); 
      queryClient.invalidateQueries({ queryKey: ["suppliers", workspaceId] }); 
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { 
      if (!workspaceId || !deletingSupplier) throw new Error("Datos incompletos"); 
      const result = await deleteSupplier(deletingSupplier.id, workspaceId); 
      if (!result.success) throw new Error(result.error); 
      return result.data; 
    },
    onSuccess: () => { 
      toast.success("Proveedor eliminado"); 
      setIsDeleteModalOpen(false); 
      setDeletingSupplier(null); 
      queryClient.invalidateQueries({ queryKey: ["suppliers", workspaceId] }); 
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const resetForm = () => { 
    setFormData({ 
      name: "", 
      contact_name: "", 
      email: "", 
      phone: "", 
      document_type: "RUC", 
      document_number: "", 
      address: ""
    }); 
    setEditingSupplier(null); 
  };
  
  const openEditModal = (supplier: any) => { 
    setEditingSupplier(supplier); 
    setFormData({ 
      name: supplier.name, 
      contact_name: supplier.contact_name || "", 
      email: supplier.email || "", 
      phone: supplier.phone || "", 
      document_type: supplier.document_type || "RUC", 
      document_number: supplier.document_number || "", 
      address: supplier.address || ""
    }); 
    setIsModalOpen(true); 
  };
  
  const openDeleteModal = (supplier: any) => { 
    setDeletingSupplier(supplier); 
    setIsDeleteModalOpen(true); 
  };

  if (workspaceLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 gap-4 text-center">
        <Building2 className="size-16 text-muted-foreground opacity-20" />
        <h3 className="text-xl font-bold tracking-tight">Workspace no encontrado</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">No pudimos cargar la información del workspace actual.</p>
      </div>
    );
  }

  const activeSuppliers = suppliers?.filter((s: any) => s.is_active).length || 0;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Base de datos centralizada de tus socios estratégicos.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]">
          <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Proveedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{suppliers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proveedores Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{activeSuppliers}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Puntos de Origen</CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {new Set(suppliers?.map((s: any) => s.address?.split(',').pop()?.trim())).size || 0} Ciudades
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre, RUC o contacto..." 
            className="pl-9 h-11 bg-background/50 border-none shadow-sm ring-1 ring-border focus-visible:ring-primary/20 transition-all rounded-xl" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="rounded-2xl border-none shadow-sm ring-1 ring-border overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6 h-12 uppercase text-[10px] font-bold tracking-widest text-muted-foreground">Proveedor</TableHead>
              <TableHead className="h-12 uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-center">Contacto Principal</TableHead>
              <TableHead className="h-12 uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-center">Identificación</TableHead>
              <TableHead className="h-12 uppercase text-[10px] font-bold tracking-widest text-muted-foreground text-center">Estado</TableHead>
              <TableHead className="w-12 h-12 pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5} className="pl-6 pr-6"><Skeleton className="h-12 w-full rounded-md" /></TableCell></TableRow>
              ))
            ) : suppliers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 grayscale opacity-40">
                  <Building2 className="mx-auto size-16 mb-4" />
                  <h3 className="text-xl font-bold tracking-tight">{searchTerm ? "Sin coincidencias" : "No hay proveedores"}</h3>
                  <p className="text-sm mt-1">{searchTerm ? "Prueba con otros términos." : "Tu agenda de proveedores está vacía."}</p>
                </TableCell>
              </TableRow>
            ) : (
              suppliers?.map((supplier: any) => (
                <TableRow key={supplier.id} className="group hover:bg-muted/20 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/5 text-primary p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold text-sm tracking-tight">{supplier.name}</div>
                        {supplier.website && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary/70 transition-colors">
                            <Globe className="h-2 w-2" />
                            {supplier.website.replace(/^https?:\/\//, '')}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="text-xs font-semibold text-center">{supplier.contact_name || <span className="text-muted-foreground italic font-normal">N/A</span>}</div>
                      <div className="flex items-center gap-2">
                        {supplier.phone && (
                          <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                            <Phone className="h-2.5 w-2.5" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                            <Mail className="h-2.5 w-2.5" />
                            {supplier.email.split('@')[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {supplier.document_number ? (
                      <div className="inline-flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{supplier.document_type || "RUC"}</span>
                        <span className="text-xs font-mono font-bold tracking-tight bg-muted/50 px-2 py-0.5 rounded border">{supplier.document_number}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={supplier.is_active ? "default" : "secondary"} className={supplier.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80" : "bg-muted text-muted-foreground"}>
                      <span className="w-1 h-1 rounded-full bg-current mr-1.5 anim-pulse" />
                      {supplier.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl overflow-hidden border-none shadow-xl ring-1 ring-border">
                        <DropdownMenuItem onClick={() => openEditModal(supplier)} className="gap-3 focus:bg-primary/5 focus:text-primary cursor-pointer py-2.5">
                          <Edit className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-3 text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer py-2.5" onClick={() => openDeleteModal(supplier)}>
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
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
        <DialogContent className="max-w-2xl border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? "Modifica los datos del proveedor registrado." : "Registra un nuevo socio comercial en tu sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 grid grid-cols-2 gap-x-6 gap-y-4 max-h-[70vh] overflow-y-auto">
            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Razón Social *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="Nombre de la empresa" 
                className="h-11 rounded-xl focus-visible:ring-primary/20 transition-all font-bold"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Documento *</Label>
              <Select value={formData.document_type} onValueChange={(val) => setFormData({...formData, document_type: val})}>
                <SelectTrigger className="h-11 rounded-xl focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="RUC">RUC</SelectItem>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">N° Documento *</Label>
              <Input 
                value={formData.document_number} 
                onChange={(e) => setFormData({...formData, document_number: e.target.value})} 
                placeholder="Ej. 20123456789" 
                className="h-11 rounded-xl focus-visible:ring-primary/20 font-mono"
              />
            </div>

            <Separator className="col-span-2 my-2 opacity-50" />

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3 w-3" /> Contacto
              </Label>
              <Input value={formData.contact_name} onChange={(e) => setFormData({...formData, contact_name: e.target.value})} placeholder="Nombre completo" className="rounded-xl h-10" />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Teléfono
              </Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+51 999..." className="rounded-xl h-10" />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="contacto@proveedor.com" className="rounded-xl h-10" />
            </div>

            <div className="col-span-2 flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Dirección
              </Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Av. Principal 123..." className="rounded-xl h-10" />
            </div>

            </div>
          <DialogFooter className="p-6 bg-muted/30 border-t items-center mt-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={!formData.name || !formData.document_number || saveMutation.isPending}
              className="rounded-xl font-bold px-8 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {editingSupplier ? "Guardar Cambios" : "Registrar Proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-destructive/5 border-b border-destructive/10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="h-6 w-6" />
              Eliminar Proveedor
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{deletingSupplier?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <p className="text-sm text-balance text-center leading-relaxed">
              Esta acción puede afectar a las órdenes de compra asociadas. No se recomienda eliminar proveedores con historial comercial activo.
            </p>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t items-center mt-0">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl">Volver</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()} 
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold px-8 shadow-lg shadow-destructive/10 transition-all hover:scale-[1.02]"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
