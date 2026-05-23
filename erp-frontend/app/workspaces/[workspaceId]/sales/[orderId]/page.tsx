"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icons
import {
  ArrowLeft,
  Package,
  User,
  Truck,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Printer,
  MessageSquare,
  History,
  ChevronRight,
  MessageCircle,
  Trash2,
} from "lucide-react";

// Types
import {
  OrderStatus,
  orderStatusLabels,
  salesChannelLabels,
  deliveryTypeLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  type Order,
} from "@/types/order";

// Actions
import {
  getOrder,
  updateOrderStatus,
  deleteOrder,
  getCouriers,
} from "@/lib/sales-actions";

// Timeline de estados
const statusFlow: OrderStatus[] = [
  "NO_CONFIRMED",
  "CONTACTED",
  "PREPARING",
  "READY",
  "SHIPPED",
  "DELIVERED",
];

const statusIcons: Record<string, React.ReactNode> = {
  NO_CONFIRMED: <Clock className="h-4 w-4" />,
  CONTACTED: <Phone className="h-4 w-4" />,
  PREPARING: <Package className="h-4 w-4" />,
  READY: <CheckCircle className="h-4 w-4" />,
  SHIPPED: <Truck className="h-4 w-4" />,
  DELIVERED: <CheckCircle className="h-4 w-4" />,
  CANCELLED: <AlertCircle className="h-4 w-4" />,
  RETURNED: <ArrowLeft className="h-4 w-4" />,
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; orderId: string }>;
}) {
  const { workspaceId: slug, orderId } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const workspaceId = workspace?.id;

  // Query para obtener la orden
  const { data: order, isLoading: orderLoading } = useQuery<Order | null>({
    queryKey: ["order", orderId, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getOrder(orderId, workspaceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: !!workspaceId,
  });

  // Query para obtener couriers
  const { data: couriers = [] } = useQuery({
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

  const handleStatusChange = async () => {
    if (!workspaceId || !order || !newStatus) return;

    setIsProcessing(true);
    const result = await updateOrderStatus(order.id, workspaceId, {
      status: newStatus,
      notes: statusNotes,
    });

    if (result.success) {
      toast.success(`Estado actualizado a ${orderStatusLabels[newStatus]}`);
      setIsStatusModalOpen(false);
      setNewStatus("");
      setStatusNotes("");
      queryClient.invalidateQueries({ queryKey: ["order", orderId, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lowStock", workspaceId] });
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const handleAssignCourier = async () => {
    if (!workspaceId || !order || !selectedCourier) return;

    setIsProcessing(true);
    const result = await updateOrderStatus(order.id, workspaceId, {
      status: order.status,
      courier_id: selectedCourier,
      tracking_number: trackingNumber,
    });

    if (result.success) {
      toast.success("Courier asignado correctamente");
      setIsCourierModalOpen(false);
      setSelectedCourier("");
      setTrackingNumber("");
      queryClient.invalidateQueries({ queryKey: ["order", orderId, workspaceId] });
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const handleDeleteOrder = async () => {
    if (!workspaceId || !order) return;

    setIsProcessing(true);
    const result = await deleteOrder(order.id, workspaceId);

    if (result.success) {
      toast.success("Orden eliminada correctamente");
      router.push(`/workspaces/${slug}/sales`);
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  const formatCurrency = (amount: any) => {
    const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch (e) {
      return "N/A";
    }
  };

  const getStatusIndex = (status: OrderStatus) => statusFlow.indexOf(status);
  const currentStatusIndex = order ? getStatusIndex(order.status) : -1;

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (workspaceLoading || orderLoading) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4 mb-2">
          <Skeleton className="size-10" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[150px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <div className="text-center py-12">
          <Package className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Orden no encontrada</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild title="Volver a ventas">
            <Link href={`/workspaces/${slug}/sales`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {order.order_number}
              </h1>
              <Badge variant={order.status === "CANCELLED" ? "destructive" : "default"}>
                {orderStatusLabels[order.status] || order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Creada el {formatDate(order.date_created)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces/${slug}/sales/${orderId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Venta
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewStatus(order.status);
              setIsStatusModalOpen(true)
            }}
          >
            <Clock className="mr-2 h-4 w-4" />
            Cambiar Estado
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Timeline de estados */}
          {order.status !== "CANCELLED" && order.status !== "RETURNED" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Progreso de la Orden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {statusFlow.map((status, index) => {
                    const isActive = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={status} className="flex items-center flex-1 last:flex-none">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`flex flex-col items-center gap-2 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                                  }`}
                              >
                                <div
                                  className={`size-9 rounded-full flex items-center justify-center border-2 ${isActive
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted bg-muted"
                                    } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                                >
                                  {statusIcons[status]}
                                </div>
                                <span className="text-[10px] font-medium hidden md:block whitespace-nowrap">
                                  {orderStatusLabels[status] || status}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{orderStatusLabels[status] || status}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {index < statusFlow.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 ${index < currentStatusIndex
                                ? "bg-primary"
                                : "bg-muted"
                              }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items de la orden */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {order.items?.length || 0} producto(s)
              </span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-right text-xs">Cant.</TableHead>
                    <TableHead className="text-right text-xs">P. Unit.</TableHead>
                    <TableHead className="text-right text-xs">Desc.</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.product?.name || "Producto"}</div>
                        {item.variant && (
                          <div className="text-[10px] text-muted-foreground">
                            Variante: {item.variant.name}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-muted-foreground mt-1 bg-muted/50 p-1 rounded">
                            {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0
                          ? formatCurrency(item.discount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 ml-auto max-w-[250px] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatCurrency(
                      order.items?.reduce((sum, item) => sum + (item.subtotal || 0), 0) || 0
                    )}
                  </span>
                </div>
                {order.shipping_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span>{formatCurrency(order.shipping_cost)}</span>
                  </div>
                )}
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="text-green-600 font-medium">
                      -{formatCurrency(order.discount_amount)}
                    </span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.total_amount || 0)}</span>
                </div>
                {order.advance_amount > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600 font-medium pt-1">
                      <span>Adelanto</span>
                      <span>-{formatCurrency(order.advance_amount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold bg-muted/30 p-2 rounded-lg border border-dashed border-primary/20">
                      <span>Saldo</span>
                      <span
                        className={
                          (order.total_amount || 0) - (order.advance_amount || 0) > 0
                            ? "text-orange-600"
                            : "text-green-600"
                        }
                      >
                        {formatCurrency((order.total_amount || 0) - (order.advance_amount || 0))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Historial de estados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial de Cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                {order.status_history && order.status_history.length > 0 ? (
                  order.status_history.map((history, index) => (
                    <div key={history.id} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div
                          className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${index === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                        >
                          {statusIcons[history.status] || <Clock className="h-4 w-4" />}
                        </div>
                        {index < (order.status_history?.length || 0) - 1 && (
                          <div className="w-0.5 grow bg-muted mt-2 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {orderStatusLabels[history.status] || history.status}
                          </span>
                          {history.previous_status && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border text-[10px] text-muted-foreground italic">
                              <span>{orderStatusLabels[history.previous_status] || history.previous_status}</span>
                              <ChevronRight className="h-3 w-3" />
                              <span className="font-bold text-foreground">{orderStatusLabels[history.status] || history.status}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(history.date_created)}
                        </div>
                        {history.notes && (
                          <div className="text-xs mt-2 p-2 bg-muted/40 rounded-md border-l-2 border-primary/40 italic">
                            "{history.notes}"
                          </div>
                        )}
                        {history.created_by_user && (
                          <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                            <Avatar className="size-4">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {history.created_by_user.first_name?.[0]}{history.created_by_user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              Por: {history.created_by_user.first_name}{" "}
                              {history.created_by_user.last_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm italic">
                    No hay cambios registrados en esta orden.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Información del cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary/5 text-primary">
                    {getInitials(order.client?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <div className="font-semibold text-sm truncate">{order.client?.name || "N/A"}</div>
                  {order.client?.document_number && (
                    <div className="text-xs text-muted-foreground font-medium">
                      {order.client.document_type || "Doc"}: {order.client.document_number}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {order.client?.phone && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{order.client.phone}</span>
                    <Button variant="outline" size="icon" className="ml-auto size-7 text-green-600 hover:bg-green-50 hover:text-green-700" asChild>
                      <a href={`https://wa.me/${order.client.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                )}

                {order.client?.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{order.client.email}</span>
                  </div>
                )}

                {order.shipping_address && (
                  <div className="flex items-start gap-2.5 text-sm pt-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium leading-tight">{order.shipping_address}</div>
                      {order.shipping_reference && (
                        <div className="text-muted-foreground text-[11px] bg-muted/60 p-1 rounded">
                          <span className="font-bold">Ref:</span> {order.shipping_reference}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de venta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Store className="h-4 w-4" />
                Detalles de Venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Canal:</span>
                <Badge variant="outline">{salesChannelLabels[order.sales_channel] || order.sales_channel}</Badge>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Entrega:</span>
                <span className="font-medium text-xs">{deliveryTypeLabels[order.delivery_type] || order.delivery_type}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Región:</span>
                <span className="font-medium text-xs">{order.region === "LIMA" ? "Lima" : "Provincia"}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Pago:</span>
                <span className="font-medium text-xs">{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Estado de pago:</span>
                <Badge
                  variant={
                    order.payment_status === "PAID"
                      ? "default"
                      : order.payment_status === "PARTIAL"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-[10px] h-5"
                >
                  {paymentStatusLabels[order.payment_status] || order.payment_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Courier y Tracking - Siempre visible para entrega a domicilio o si ya tiene datos */}
          {(order.courier || order.tracking_number || order.delivery_type === "DELIVERY") && (
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardHeader className="pb-3 px-4 pt-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                  <Truck className="h-4 w-4" />
                  Seguimiento de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-4 pb-4">
                {order.courier ? (
                  <>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground text-xs">Courier:</span>
                        <Badge variant="secondary" className="font-bold">{order.courier.name}</Badge>
                      </div>
                      {order.courier.phone && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground text-xs">Teléfono:</span>
                          <span className="font-medium">{order.courier.phone}</span>
                        </div>
                      )}
                      {order.tracking_number && (
                        <div className="flex flex-col gap-1.5 bg-muted/40 p-2 rounded-md border border-dashed border-muted-foreground/20">
                          <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Número de Seguimiento</span>
                          <span className="font-mono text-xs text-primary font-semibold">
                            {order.tracking_number}
                          </span>
                        </div>
                      )}
                      {order.estimated_delivery_date && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground text-xs">Entrega estimada:</span>
                          <span className="font-medium">
                            {format(new Date(order.estimated_delivery_date), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center space-y-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Truck className="h-5 w-5 text-primary/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Sin Courier Asignado</p>
                      <p className="text-[10px] text-muted-foreground">Asigna un transportista para el seguimiento.</p>
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  variant={order.courier ? "outline" : "default"}
                  className="w-full h-8 text-xs font-bold"
                  onClick={() => {
                    setSelectedCourier(order.courier_id || "");
                    setTrackingNumber(order.tracking_number || "");
                    setIsCourierModalOpen(true);
                  }}
                >
                  {order.courier ? (
                    <><Edit className="mr-1.5 h-3.5 w-3.5" /> Modificar Courier</>
                  ) : (
                    <><Truck className="mr-1.5 h-3.5 w-3.5" /> Asignar Courier</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          {(order.notes || order.internal_notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.notes && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nota para el cliente</div>
                    <div className="text-xs p-3 bg-primary/5 rounded-lg border border-primary/10 italic leading-relaxed text-foreground/80">
                      "{order.notes}"
                    </div>
                  </div>
                )}
                {order.internal_notes && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Notas Internas</div>
                    <div className="text-xs p-3 bg-muted rounded-lg border italic leading-relaxed text-foreground/80">
                      "{order.internal_notes}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal cambiar estado */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              Actualiza el progreso de la orden {order.order_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seleccionar nuevo estado</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orderStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      <div className="flex items-center gap-2">
                        {statusIcons[value as OrderStatus]}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notas del cambio (opcional)</Label>
              <Textarea
                placeholder="Ej: El cliente confirmó que el pedido está correcto..."
                className="resize-none h-24"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={!newStatus || isProcessing} className="px-8">
              {isProcessing ? "Actualizando..." : "Guardar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal asignar courier */}
      <Dialog open={isCourierModalOpen} onOpenChange={setIsCourierModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{order.courier ? "Modificar" : "Asignar"} Maestro Logístico</DialogTitle>
            <DialogDescription>
              {order.courier
                ? "Actualiza el responsable del envío y el código de seguimiento."
                : "Selecciona el transportista encargado de llevar el pedido al cliente."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="courier" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Seleccionar Courier / Motorizado
              </Label>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger id="courier" className="h-11">
                  <SelectValue placeholder="Busca o selecciona un courier" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((courier: { id: string; name: string; phone?: string }) => (
                    <SelectItem key={courier.id} value={courier.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{courier.name}</span>
                        {courier.phone && <span className="text-[10px] text-muted-foreground">{courier.phone}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Número de Guía / Tracking
              </Label>
              <div className="relative">
                <Truck className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input
                  id="tracking"
                  placeholder="Ej: TK-90210-24"
                  className="pl-9 h-11"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
                        <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsCourierModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAssignCourier} disabled={!selectedCourier || isProcessing} className="px-8">
                  {isProcessing ? "Asignando..." : "Confirmar Envío"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal eliminar */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  ¿Eliminar esta orden?
                </DialogTitle>
                <DialogDescription className="pt-2">
                  Estás a punto de eliminar permanentemente la orden <span className="font-bold text-foreground">{order.order_number}</span>.
                  <br /><br />
                  Esta acción eliminará todos los registros asociados, incluyendo el historial y los movimientos de inventario vinculados. <span className="font-bold">No se puede deshacer.</span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 gap-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  Conservar Orden
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteOrder}
                  disabled={isProcessing}
                  className="px-8 font-bold"
                >
                  {isProcessing ? "Eliminando..." : "Eliminar Definitivamente"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      );
    }
