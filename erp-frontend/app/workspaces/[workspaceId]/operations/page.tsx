"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Icons
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Phone,
  User,
  MapPin,
  ChevronRight,
  Loader2,
  ClipboardList,
} from "lucide-react";

// Types
import { OrderStatus, orderStatusLabels, Order } from "@/types/order";

// Actions
import {
  getOrdersByStatus,
  getOperationsStats,
  moveOrderStatus,
  quickMarkShipped,
} from "@/lib/operations-actions";
import { getCouriers } from "@/lib/couriers-actions";
import type { KanbanColumn } from "@/lib/operations-actions";
import {
  Facebook,
  MessageCircle,
  Instagram,
  Video,
  Globe
} from "lucide-react";

const channelIcons: Record<string, React.ElementType> = {
  FACEBOOK: Facebook,
  WHATSAPP: MessageCircle,
  INSTAGRAM: Instagram,
  TIKTOK: Video,
  OTHER: Globe,
};

const kanbanColumns: { status: OrderStatus; title: string; color: string; icon: React.ElementType }[] = [
  { status: "NO_CONFIRMED", title: "No Confirmados", color: "bg-yellow-500/10 border-yellow-500/20", icon: Clock },
  { status: "CONTACTED", title: "Contactados", color: "bg-blue-500/10 border-blue-500/20", icon: Phone },
  { status: "PREPARING", title: "Preparando", color: "bg-purple-500/10 border-purple-500/20", icon: Package },
  { status: "READY", title: "Listos", color: "bg-orange-500/10 border-orange-500/20", icon: ClipboardList },
  { status: "SHIPPED", title: "Enviados", color: "bg-indigo-500/10 border-indigo-500/20", icon: Truck },
  { status: "DELIVERED", title: "Entregados", color: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
];

export default function OperationsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");

  const workspaceId = workspace?.id;

  // Query para obtener órdenes por estado
  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ["operations-kanban", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getOrdersByStatus(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ["operations-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getOperationsStats(workspaceId);
      if (!result.success) throw new Error(result.error);
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
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Mutación para mover orden
  const moveMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      if (!workspaceId) throw new Error("No workspace");
      const result = await moveOrderStatus(workspaceId, orderId, newStatus);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Orden movida correctamente");
      queryClient.invalidateQueries({ queryKey: ["operations-kanban", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["operations-stats", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lowStock", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutación para marcar como enviado
  const shipMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !selectedOrder) throw new Error("Datos incompletos");
      const result = await quickMarkShipped(workspaceId, selectedOrder.id, trackingNumber, selectedCourier);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Orden marcada como enviada");
      setIsShipModalOpen(false);
      setSelectedOrder(null);
      setTrackingNumber("");
      setSelectedCourier("");
      queryClient.invalidateQueries({ queryKey: ["operations-kanban", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["operations-stats", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lowStock", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getColumnOrders = (status: OrderStatus): Order[] => {
    if (!kanbanData) return [];
    const column = kanbanData.find((c: KanbanColumn) => c.status === status);
    return column?.orders || [];
  };

  const handleNextStatus = (order: Order) => {
    const statusFlow: OrderStatus[] = ["NO_CONFIRMED", "CONTACTED", "PREPARING", "READY", "SHIPPED", "DELIVERED"];
    const currentIndex = statusFlow.indexOf(order.status);
    if (currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];

      if (nextStatus === "SHIPPED") {
        setSelectedOrder(order);
        setIsShipModalOpen(true);
      } else {
        moveMutation.mutate({ orderId: order.id, newStatus: nextStatus });
      }
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
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[500px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="text-center py-12">
          <TrendingUp className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6 w-full max-w-full overflow-hidden">
      {/* Override max-width from layout for full-screen Kanban experience */}
      <style dangerouslySetInnerHTML={{
        __html: `
        [data-content-wrapper] { 
          max-width: none !important; 
          width: 100% !important;
          padding-left: 1.5rem !important;
          padding-right: 1.5rem !important;
        }
      `}} />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operaciones</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pipeline visual de gestión logística de órdenes.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        <Card className="min-w-0 shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{stats?.pending_confirmation || 0}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium">En Tránsito</CardTitle>
            <Truck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{stats?.in_transit || 0}</div>
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-sm font-medium">Entregados Hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-2xl font-bold">{stats?.delivered_today || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-4 min-w-max px-4">
          {kanbanColumns.map((column) => {
            const orders = getColumnOrders(column.status);
            const Icon = column.icon;

            return (
              <div
                key={column.status}
                className={`flex flex-col rounded-lg border ${column.color} w-[280px] shrink-0 min-h-[500px] shadow-sm`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {orders.length}
                    </Badge>
                  </div>
                </div>

                {/* Orders */}
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-2">
                    {kanbanLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))
                    ) : orders.length === 0 ? (
                      <div className="text-center py-8">
                        <ClipboardList className="mx-auto size-8 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mt-2">Sin órdenes</p>
                      </div>
                    ) : (
                      orders.map((order: Order) => (
                        <Card
                          key={order.id}
                          className="group relative overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/50"
                        >
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center justify-between gap-1">
                              <Link
                                href={`/workspaces/${slug}/sales/${order.id}`}
                                className="font-bold text-sm hover:text-primary transition-colors flex items-center gap-2 truncate"
                              >
                                {order.order_number}
                                {(order.status === "NO_CONFIRMED" || order.status === "CONTACTED") &&
                                  new Date(order.date_created).getTime() < Date.now() - 24 * 60 * 60 * 1000 && (
                                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                  )}
                              </Link>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {order.sales_channel && channelIcons[order.sales_channel] && (
                                  <div className="text-muted-foreground">
                                    {(() => {
                                      const Icon = channelIcons[order.sales_channel];
                                      return <Icon className="h-3.5 w-3.5" />;
                                    })()}
                                  </div>
                                )}
                                <Badge variant={order.payment_status === "PAID" ? "default" : "outline"} className="text-[10px] h-4 px-1">
                                  {order.payment_status === "PAID" ? "Pagado" : "Pendiente"}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-medium">
                                <div className="bg-primary/10 p-1 rounded shrink-0">
                                  <User className="h-3 w-3 text-primary" />
                                </div>
                                <span className="truncate">{order.client?.name || "Cliente Desconocido"}</span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded-md">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{order.shipping_address || "Sin dirección de envío"}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total</span>
                                <span className="font-bold text-sm text-primary">
                                  {formatCurrency(order.total_amount)}
                                </span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Fecha</span>
                                <span className="text-xs">
                                  {new Date(order.date_created).toLocaleDateString("es-PE", { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>

                            {column.status !== "DELIVERED" && (
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs font-semibold shadow-sm hover:shadow-primary/20 transition-all"
                                onClick={() => handleNextStatus(order)}
                                disabled={moveMutation.isPending}
                              >
                                {moveMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    {column.status === "NO_CONFIRMED" && "Confirmar"}
                                    {column.status === "CONTACTED" && "Preparar"}
                                    {column.status === "PREPARING" && "Empacar"}
                                    {column.status === "READY" && "Enviar"}
                                    {column.status === "SHIPPED" && "Entregado"}
                                    <ChevronRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                                  </div>
                                )}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Modal para marcar como enviado */}
      <Dialog open={isShipModalOpen} onOpenChange={setIsShipModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Enviado</DialogTitle>
            <DialogDescription>
              Ingresa los datos de envío para la orden {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Courrier</Label>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar courier" />
                </SelectTrigger>
                <SelectContent>
                  {couriersData?.map((courier: { id: string; name: string }) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número de Guía (opcional)</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ej: TRK123456"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShipModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => shipMutation.mutate()}
              disabled={!selectedCourier || shipMutation.isPending}
            >
              {shipMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
