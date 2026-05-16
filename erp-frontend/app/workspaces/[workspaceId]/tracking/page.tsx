"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icons
import {
  Search,
  MoreHorizontal,
  Eye,
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  Loader2,
} from "lucide-react";

// Types
import { OrderStatus, orderStatusLabels, orderStatusBadgeVariants } from "@/types/order";

// Actions
import { getOrders, updateOrderStatus, getOrderStats } from "@/lib/sales-actions";
import { getCouriers } from "@/lib/couriers-actions";

const courierOptions = [
  { value: "all", label: "Todos los couriers" },
];

const trackingStatusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "SHIPPED", label: "En Tránsito" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "RETURNED", label: "Devuelto" },
];

export default function TrackingPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Modal de actualización de tracking
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; order_number: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingStatus, setTrackingStatus] = useState<OrderStatus>("SHIPPED");

  const workspaceId = workspace?.id;

  // Query para obtener estadísticas de tracking
  const { data: statsData } = useQuery({
    queryKey: ["tracking-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getOrderStats(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!workspaceId,
  });

  // Query para obtener órdenes en tránsito
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["tracking-orders", workspaceId, selectedCourier, selectedStatus, searchTerm, currentPage],
    queryFn: async () => {
      if (!workspaceId) return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };

      const filters: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      // Solo mostrar órdenes enviadas o entregadas por defecto
      if (selectedStatus === "all") {
        filters.status = ["SHIPPED", "DELIVERED"];
      } else {
        filters.status = [selectedStatus];
      }

      if (selectedCourier !== "all") {
        filters.courier_id = selectedCourier;
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
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Mutación para actualizar tracking
  const updateTrackingMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !selectedOrder) throw new Error("Datos incompletos");
      const result = await updateOrderStatus(selectedOrder.id, workspaceId, {
        status: trackingStatus,
        tracking_number: trackingNumber,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Tracking actualizado correctamente");
      setIsTrackingModalOpen(false);
      setSelectedOrder(null);
      setTrackingNumber("");
      queryClient.invalidateQueries({ queryKey: ["tracking-orders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["tracking-stats", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const orders = ordersData?.data || [];
  const totalPages = ordersData?.pagination?.totalPages || 1;
  const couriers = couriersData || [];
  const stats = statsData;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount);
  };

  const openTrackingModal = (order: { id: string; order_number: string; tracking_number?: string; status: OrderStatus }) => {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || "");
    setTrackingStatus(order.status);
    setIsTrackingModalOpen(true);
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
          <Truck className="mx-auto size-12 text-muted-foreground opacity-50" />
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
          <h1 className="text-2xl font-bold tracking-tight">Seguimiento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorea el estado de las órdenes en tránsito.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Truck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.by_status?.SHIPPED || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregados (Total)</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.delivered_orders || stats?.by_status?.DELIVERED || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total en Seguimiento</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordersData?.pagination?.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar envíos..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Courier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los couriers</SelectItem>
              {couriers.map((courier: { id: string; name: string }) => (
                <SelectItem key={courier.id} value={courier.id}>
                  {courier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {trackingStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>N° Guía</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Fecha Envío</TableHead>
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
                  <Truck className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">
                    {searchTerm ? "No hay resultados" : "No hay órdenes en seguimiento"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Intenta con otro término de búsqueda." : "No se encontraron órdenes en seguimiento."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: {
                id: string;
                order_number: string;
                status: OrderStatus;
                tracking_number?: string;
                total_amount: number;
                date_created: string;
                date_updated: string;
                shipping_address?: string;
                courier?: { id: string; name: string; phone?: string };
                client?: { name?: string; phone?: string };
              }) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.order_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.client?.name || "N/A"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {order.client?.phone || "Sin teléfono"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {order.courier ? (
                      <div>
                        <div className="font-medium">{order.courier.name}</div>
                        {order.courier.phone && (
                          <div className="text-xs text-muted-foreground">{order.courier.phone}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No asignado</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {order.tracking_number ? (
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                        {order.tracking_number}
                      </code>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={orderStatusBadgeVariants[order.status]}>
                      {orderStatusLabels[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start gap-1 text-sm max-w-[200px]">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="truncate">{order.shipping_address || "Sin dirección"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.total_amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {order.status === "SHIPPED" || order.status === "DELIVERED" ? formatDate(order.date_updated) : "-"}
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
                        <DropdownMenuItem onClick={() => openTrackingModal(order)}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Actualizar tracking
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
        <div className="flex items-center justify-between">
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

      {/* Modal de actualización de tracking */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Tracking</DialogTitle>
            <DialogDescription>
              Actualiza el estado y número de guía de la orden {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={trackingStatus} onValueChange={(v) => setTrackingStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIPPED">En Tránsito</SelectItem>
                  <SelectItem value="DELIVERED">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Número de Guía</label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ej: TRK123456789"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrackingModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateTrackingMutation.mutate()}
              disabled={updateTrackingMutation.isPending}
            >
              {updateTrackingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
