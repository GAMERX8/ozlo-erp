"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, ShoppingCart, CheckCircle, XCircle, Truck, Package, Loader2, Building2, User, Calendar, DollarSign, Box, FileText, Info } from "lucide-react";
import { getPurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder, receivePurchaseItems } from "@/lib/purchases-actions";
import { purchaseStatusLabels, purchaseStatusBadgeVariants, type PurchaseOrder } from "@/types/purchase";

export default function PurchaseDetailPage({ params }: { params: Promise<{ workspaceId: string; purchaseId: string }> }) {
  const { workspaceId: slug, purchaseId } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [receivedItems, setReceivedItems] = useState<{[key: string]: number}>({});

  const workspaceId = workspace?.id;

  const { data: purchase, isLoading: purchaseLoading } = useQuery({
    queryKey: ["purchase", purchaseId, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getPurchaseOrder(purchaseId, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data as PurchaseOrder;
    },
    enabled: !!workspaceId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const result = await submitPurchaseOrder(purchaseId, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Orden enviada al proveedor");
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const result = await cancelPurchaseOrder(purchaseId, workspaceId, cancelReason);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Orden cancelada");
      setIsCancelModalOpen(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const items = Object.entries(receivedItems).filter(([_, qty]) => qty > 0).map(([itemId, quantity_received]) => ({ item_id: itemId, quantity_received }));
      if (items.length === 0) throw new Error("No hay items para recibir");
      const result = await receivePurchaseItems(purchaseId, workspaceId, { items });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Mercadería recibida correctamente");
      setIsReceiveModalOpen(false);
      setReceivedItems({});
      
      // Actualizar datos del workspace
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lowStock", workspaceId] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });



  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  if (workspaceLoading || purchaseLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] w-full rounded-xl" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[150px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!workspace || !purchase) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6 items-center justify-center py-20">
        <ShoppingCart className="size-16 text-muted-foreground opacity-20" />
        <h3 className="mt-4 text-xl font-bold tracking-tight">Orden no encontrada</h3>
        <p className="text-muted-foreground mt-1">La orden que buscas no existe o no tienes acceso.</p>
        <Button variant="outline" className="mt-6" asChild>
          <Link href={`/workspaces/${slug}/purchases`}>Volver a Compras</Link>
        </Button>
      </div>
    );
  }

  const canSubmit = purchase.status === "DRAFT" || purchase.status === "draft";
  const canReceive = purchase.status === "ORDERED" || purchase.status === "ordered" || purchase.status === "PARTIAL" || purchase.status === "partial";
  const canCancel = purchase.status !== "RECEIVED" && purchase.status !== "received" && purchase.status !== "CANCELLED" && purchase.status !== "cancelled";

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-xl">
            <Link href={`/workspaces/${slug}/purchases`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{purchase.order_number}</h1>
              <Badge variant={purchaseStatusBadgeVariants[purchase.status.toUpperCase()] || purchaseStatusBadgeVariants[purchase.status]}>
                {purchaseStatusLabels[purchase.status.toUpperCase()] || purchaseStatusLabels[purchase.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Creado el {formatDate(purchase.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]">
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
              Enviar a Proveedor
            </Button>
          )}
          {canReceive && (
            <Button onClick={() => setIsReceiveModalOpen(true)} variant="default" className="shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]">
              <Package className="h-4 w-4 mr-2" /> Recibir Mercadería
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => setIsCancelModalOpen(true)} className="hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-colors">
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Box className="h-5 w-5 text-primary" />
                Items de la Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">Producto</TableHead>
                    <TableHead className="text-center">Ordenado</TableHead>
                    <TableHead className="text-center">Recibido</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6">
                        <div className="font-medium">{item.product?.name || "Producto"}</div>
                        {item.product?.sku && <div className="text-[10px] text-muted-foreground uppercase font-bold">SKU: {item.product.sku}</div>}
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.quantity_received >= item.quantity_ordered ? "default" : "secondary"} className={item.quantity_received > 0 && item.quantity_received < item.quantity_ordered ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : ""}>
                          {item.quantity_received} / {item.quantity_ordered}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell className="text-right pr-6 font-bold text-sm tracking-tight">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {purchase.notes && (
            <Card className="border-none shadow-sm ring-1 ring-border">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{purchase.notes}"</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-none shadow-sm ring-1 ring-border mt-1">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-semibold">{formatCurrency(purchase.subtotal || purchase.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  IGV <span className="text-[10px] bg-muted-foreground/10 px-1 rounded">18%</span>
                </span>
                <span className="font-semibold">{formatCurrency(purchase.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-base">Total Final</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(purchase.final_amount || purchase.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight">{purchase.supplier?.name}</span>
                  {purchase.supplier?.document_number && <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">RUC: {purchase.supplier.document_number}</span>}
                </div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{purchase.supplier?.contact_name || "Sin contacto registrado"}</span>
                </div>
                {purchase.supplier?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-3.5 w-3.5 flex items-center justify-center font-bold text-[10px]">T</div>
                    <span>{purchase.supplier.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Logística
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <Box className="h-4 w-4" /> Almacén:
                </span>
                <span className="font-semibold text-primary">{purchase.warehouse?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Entrega:
                </span>
                <span className="font-semibold">{formatDate(purchase.expected_date)}</span>
              </div>
              {purchase.invoice_number && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Referencia:
                  </span>
                  <span className="font-mono text-xs font-bold">{purchase.invoice_number}</span>
                </div>
              )}
              {purchase.received_date && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center gap-3 border border-emerald-100">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Recibido completa el</span>
                    <span className="text-sm font-bold">{formatDate(purchase.received_date)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="max-w-2xl border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 bg-muted/30 border-b">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Recibir Mercadería
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Confirma los productos que están ingresando al almacén de forma física.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const allItems: {[key: string]: number} = {};
                  purchase.items?.forEach((item: any) => {
                    const remaining = item.quantity_ordered - item.quantity_received;
                    if (remaining > 0) allItems[item.id] = remaining;
                  });
                  setReceivedItems(allItems);
                }}
                className="h-7 text-[10px] font-bold uppercase tracking-tighter"
              >
                Recibir Todo
              </Button>
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center uppercase text-[10px] font-bold">Ordenado</TableHead>
                  <TableHead className="text-center uppercase text-[10px] font-bold">Recibido</TableHead>
                  <TableHead className="text-right pr-6 uppercase text-[10px] font-bold">Ingresar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items?.map((item: any) => {
                  const maxQty = item.quantity_ordered - item.quantity_received;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.product?.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Max para recibir: {maxQty}</div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.quantity_received}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Input 
                          type="number" 
                          min={0} 
                          max={maxQty} 
                          placeholder="0"
                          value={receivedItems[item.id] || ""} 
                          onChange={(e) => setReceivedItems({...receivedItems, [item.id]: parseInt(e.target.value) || 0})} 
                          className="w-20 ml-auto h-9 text-center focus-visible:ring-primary/20 font-bold" 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t items-center mt-0">
            <Button variant="ghost" onClick={() => setIsReceiveModalOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              className="rounded-xl font-bold px-6 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
              onClick={() => receiveMutation.mutate()} 
              disabled={receiveMutation.isPending || Object.values(receivedItems).reduce((a, b) => a + b, 0) === 0}
            >
              {receiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Ingreso a Almacén
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-destructive/5 border-b border-destructive/10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Cancelar Orden de Compra
            </DialogTitle>
            <DialogDescription>
              Esta acción detendrá el proceso de compra. El stock no será afectado.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motivo de cancelación (opcional)</Label>
              <Textarea 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)} 
                placeholder="Ingresa por qué se cancela esta orden..." 
                className="resize-none focus-visible:ring-destructive/20 h-24"
              />
            </div>
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs flex gap-3 border border-amber-100">
              <Info className="h-4 w-4 shrink-0" />
              <p>Solo puedes cancelar órdenes que no hayan sido recibidas completamente. Esta acción es irreversible.</p>
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/30 border-t items-center mt-0">
            <Button variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="rounded-xl">Volver</Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelMutation.mutate()} 
              disabled={cancelMutation.isPending}
              className="rounded-xl font-bold px-8 shadow-lg shadow-destructive/10 transition-all hover:scale-[1.02]"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
