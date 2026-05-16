"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";


// Icons
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Package,
  Truck,
  CheckCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";

// Types
import {
  OrderStatus,
  OrderFilters,
  orderStatusLabels,
  orderStatusBadgeVariants,
  salesChannelLabels,
  deliveryTypeLabels,
  type Order,
  type SalesChannel,
  type PaginatedOrders,
} from "@/types/order";

// Actions
import {
  getOrders,
  bulkUpdateStatus,
  deleteOrder,
  getCouriers,
  updateOrderStatus,
} from "@/lib/sales-actions";

const statusTabs: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "NO_CONFIRMED", label: "No Confirmados" },
  { value: "CONTACTED", label: "Contactados" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "PREPARING", label: "En Preparación" },
  { value: "READY", label: "Listos" },
  { value: "SHIPPED", label: "Enviados" },
  { value: "DELIVERED", label: "Entregados" },
  { value: "CANCELLED", label: "Cancelados" },
  { value: "RETURNED", label: "Devueltos" },
];

const salesChannelOptions = [
  { value: "all", label: "Todos" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "OTHER", label: "Otro" },
];

export default function SalesPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState<OrderStatus | "all">("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Modales
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const workspaceId = workspace?.id;

  // Query para obtener órdenes
  const { data: ordersData, isLoading: ordersLoading } = useQuery<PaginatedOrders>({
    queryKey: ["orders", workspaceId, currentTab, selectedChannel, searchTerm, currentPage],
    queryFn: async () => {
      if (!workspaceId) return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

      const filters: OrderFilters = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (currentTab !== "all") {
        filters.status = currentTab;
      }

      if (selectedChannel !== "all") {
        filters.sales_channel = selectedChannel as any;
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const result = await getOrders(workspaceId, filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!workspaceId,
  });

  // Query para obtener couriers
  const { data: couriersData } = useQuery({
    queryKey: ["couriers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getCouriers(workspaceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!workspaceId,
  });

  const orders = ordersData?.data || [];
  const totalPages = ordersData?.meta?.totalPages || 1;
  const couriers = couriersData || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleBulkStatusChange = async () => {
    if (!workspaceId || !newStatus || selectedOrders.length === 0) return;

    setIsProcessing(true);
    const result = await bulkUpdateStatus(workspaceId, {
      order_ids: selectedOrders,
      status: newStatus,
    });

    if (result.success) {
      toast.success(`${result.data?.updated || 0} órdenes actualizadas`);
      setSelectedOrders([]);
      setIsStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const handleAssignCourier = async () => {
    if (!workspaceId || !selectedCourier || !selectedOrderForAction) return;

    setIsProcessing(true);
    const result = await updateOrderStatus(selectedOrderForAction.id, workspaceId, {
      status: selectedOrderForAction.status,
      courier_id: selectedCourier,
    });

    if (result.success) {
      toast.success("Courier asignado correctamente");
      setIsCourierModalOpen(false);
      setSelectedOrderForAction(null);
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const handleDeleteOrder = async () => {
    if (!workspaceId || !selectedOrderForAction) return;

    setIsProcessing(true);
    const result = await deleteOrder(selectedOrderForAction.id, workspaceId);

    if (result.success) {
      toast.success("Orden eliminada correctamente");
      setIsDeleteModalOpen(false);
      setSelectedOrderForAction(null);
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount);
  };

  if (workspaceLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona tus órdenes y seguimiento de ventas.
          </p>
        </div>
        <Button asChild>
          <Link href={`/workspaces/${slug}/sales/new`}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Venta
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar órdenes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Canal de venta" />
            </SelectTrigger>
            <SelectContent>
              {salesChannelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Acciones masivas */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedOrders.length} orden(es) seleccionada(s)
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusModalOpen(true)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Cambiar Estado
          </Button>
        </div>
      )}

      {/* Tabs de estados */}
      <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as OrderStatus | "all")}>
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto gap-1">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={currentTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        orders.length > 0 && selectedOrders.length === orders.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Package className="mx-auto size-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">
                        {searchTerm ? "No hay resultados" : "No hay órdenes"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchTerm ? "Intenta con otro término de búsqueda." : "Crea tu primera orden de venta."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order: Order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOrder(order.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.items?.length || 0} item(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.client?.name || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.client?.phone || "Sin teléfono"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={orderStatusBadgeVariants[order.status] || "default"}>
                          {orderStatusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {salesChannelLabels[order.sales_channel] || order.sales_channel}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {deliveryTypeLabels[order.delivery_type] || order.delivery_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.region === "LIMA" ? "Lima" : "Provincia"}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.date_created)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/workspaces/${slug}/sales/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                setSelectedCourier(order.courier_id || "");
                                setIsCourierModalOpen(true);
                              }}
                            >
                              <Truck className="mr-2 h-4 w-4" />
                              Asignar courier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedOrderForAction(order);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal cambiar estado masivo */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo estado para {selectedOrders.length} orden(es).
            </DialogDescription>
          </DialogHeader>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {statusTabs
                .filter((s) => s.value !== "all")
                .map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkStatusChange} disabled={!newStatus || isProcessing}>
              {isProcessing ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal asignar courier */}
      <Dialog open={isCourierModalOpen} onOpenChange={setIsCourierModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Courier</DialogTitle>
            <DialogDescription>
              Selecciona el courier para la orden {selectedOrderForAction?.order_number}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar courier" />
            </SelectTrigger>
            <SelectContent>
              {couriers.map((courier: { id: string; name: string; phone?: string }) => (
                <SelectItem key={courier.id} value={courier.id}>
                  {courier.name} {courier.phone && `- ${courier.phone}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCourierModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignCourier} disabled={!selectedCourier || isProcessing}>
              {isProcessing ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal eliminar */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Orden</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar la orden {selectedOrderForAction?.order_number}?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={isProcessing}
            >
              {isProcessing ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
