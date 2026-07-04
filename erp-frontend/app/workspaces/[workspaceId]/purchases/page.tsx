"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Loader2, ShoppingCart, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, Truck } from "lucide-react";
import { getPurchaseOrders, deletePurchaseOrder, getPurchaseStats, updatePurchaseOrder, receivePurchaseItems } from "@/lib/purchases-actions";
import { purchaseStatusLabels, purchaseStatusBadgeVariants, type PurchaseStatus, type PurchaseOrder, type PurchaseFilters } from "@/types/purchase";
import { getSuppliers } from "@/lib/suppliers-actions";

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "ordered", label: "Ordenado" },
  { value: "partial", label: "Parcial" },
  { value: "received", label: "Recibido" },
  { value: "cancelled", label: "Cancelado" },
];

export default function PurchasesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPurchase, setDeletingPurchase] = useState<PurchaseOrder | null>(null);
  
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updatingPurchase, setUpdatingPurchase] = useState<PurchaseOrder | null>(null);
  const [newStatus, setNewStatus] = useState<PurchaseStatus | "">("");

  const workspaceId = workspace?.id;

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchases", workspaceId, statusFilter, supplierFilter, searchTerm, currentPage],
    queryFn: async () => {
      if (!workspaceId) return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      const filters: PurchaseFilters = { page: currentPage, limit: itemsPerPage };
      if (statusFilter !== "all") filters.status = statusFilter as PurchaseStatus;
      if (supplierFilter !== "all") filters.supplier_id = supplierFilter;
      if (searchTerm) filters.search = searchTerm;
      const result = await getPurchaseOrders(workspaceId, filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!workspaceId,
  });

  const { data: stats } = useQuery({
    queryKey: ["purchase-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getPurchaseStats(workspaceId);
      if (!result.success) return null;
      return result.data;
    },
    enabled: !!workspaceId,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getSuppliers(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !deletingPurchase) throw new Error("Datos incompletos");
      const result = await deletePurchaseOrder(deletingPurchase.id, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Orden de compra eliminada");
      setIsDeleteModalOpen(false);
      setDeletingPurchase(null);
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openDeleteModal = (purchase: any) => {
    setDeletingPurchase(purchase);
    setIsDeleteModalOpen(true);
  };

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !updatingPurchase || !newStatus) throw new Error("Datos incompletos");
      
      if (newStatus.toUpperCase() === "RECEIVED") {
        // Enviar ítems para recepción completa
        const itemsToReceive = updatingPurchase.items?.map(i => ({
          item_id: i.id,
          quantity_received: i.quantity_ordered,
        })) || [];
        
        const result = await receivePurchaseItems(updatingPurchase.id, workspaceId, { items: itemsToReceive as any });
        if (!result.success) throw new Error(result.error);
        return result.data;
      } else {
        const result = await updatePurchaseOrder(updatingPurchase.id, workspaceId, { status: newStatus.toUpperCase() });
        if (!result.success) throw new Error(result.error);
        return result.data;
      }
    },
    onSuccess: () => {
      toast.success("Estado de la orden actualizado");
      setIsStatusModalOpen(false);
      setUpdatingPurchase(null);
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-stats", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openStatusModal = (purchase: PurchaseOrder) => {
    setUpdatingPurchase(purchase);
    setNewStatus(purchase.status.toLowerCase() as PurchaseStatus);
    setIsStatusModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const purchases = purchasesData?.data || [];
  const totalPages = purchasesData?.meta?.totalPages || 1;

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
          <ShoppingCart className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de Compra</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus órdenes de compra a proveedores.</p>
        </div>
        <Button onClick={() => router.push(`/workspaces/${slug}/purchases/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Compra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stats?.totalPurchases || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Borradores</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats?.byStatus.find((s: any) => s.status.toLowerCase() === 'draft')?._count.status || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pendientes</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats?.byStatus.find((s: any) => s.status.toLowerCase() === 'ordered')?._count.status || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recibidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats?.byStatus.find((s: any) => s.status.toLowerCase() === 'received')?._count.status || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-border bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Inversión Total</CardTitle>
            <span className="text-xs font-bold text-primary">S/</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-primary">
              {formatCurrency(stats?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar órdenes de compra..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>{statusOptions.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Proveedor" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{suppliers?.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Orden</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchasesLoading ? (Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell></TableRow>))) : purchases.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><ShoppingCart className="mx-auto size-12 text-muted-foreground opacity-50" /><h3 className="mt-4 text-lg font-medium">{searchTerm ? "No hay resultados" : "No hay órdenes de compra"}</h3><p className="text-sm text-muted-foreground mt-1">{searchTerm ? "Intenta con otro término de búsqueda." : "Crea tu primera orden de compra."}</p></TableCell></TableRow>
            ) : (purchases.map((purchase: PurchaseOrder) => (
              <TableRow key={purchase.id}>
                <TableCell><div className="font-medium">{purchase.order_number}</div></TableCell>
                <TableCell><div className="font-medium">{purchase.supplier?.name || "N/A"}</div></TableCell>
                <TableCell><Badge variant={purchaseStatusBadgeVariants[purchase.status.toUpperCase()] || purchaseStatusBadgeVariants[purchase.status]}>{purchaseStatusLabels[purchase.status.toUpperCase()] || purchaseStatusLabels[purchase.status]}</Badge></TableCell>
                <TableCell>{purchase.items?.length || 0} items</TableCell>
                <TableCell className="font-medium">{formatCurrency(purchase.final_amount || purchase.total_amount)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(purchase.created_at)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/workspaces/${slug}/purchases/${purchase.id}`}><Eye className="mr-2 h-4 w-4" /> Ver detalle</Link></DropdownMenuItem>
                      {purchase.status?.toLowerCase() !== "received" && purchase.status?.toLowerCase() !== "cancelled" && (
                        <DropdownMenuItem onClick={() => openStatusModal(purchase)}><Edit className="mr-2 h-4 w-4" /> Actualizar estado</DropdownMenuItem>
                      )}
                      {(purchase.status?.toLowerCase() === "draft") && (<DropdownMenuItem onClick={() => openDeleteModal(purchase)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Eliminar Orden</DialogTitle><DialogDescription>¿Estás seguro de eliminar la orden {deletingPurchase?.order_number}? Esta acción no se puede deshacer.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Eliminar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Estado</DialogTitle>
            <DialogDescription>Cambia el estado de la orden {updatingPurchase?.order_number}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Nuevo Estado</Label>
            <Select value={newStatus} onValueChange={(val) => setNewStatus(val as PurchaseStatus)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="ordered">Pendiente</SelectItem>
                <SelectItem value="received">Recibido (Aumenta stock)</SelectItem>
              </SelectContent>
            </Select>
            {newStatus === 'received' && (
              <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded-md">
                Al marcar como Recibido, se agregará automáticamente el inventario solicitado al almacén y la orden no podrá volver a un estado anterior.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending || !newStatus || newStatus === updatingPurchase?.status.toLowerCase()}>
              {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
