"use client";

import { useState, use, useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  ShoppingCart, 
  PlusCircle, 
  Info,
  Package,
  Building2,
  Calendar,
  DollarSign
} from "lucide-react";
import { getSuppliers } from "@/lib/suppliers-actions";
import { createPurchaseOrder } from "@/lib/purchases-actions";
import { getProducts } from "@/lib/products-actions";
import { getWarehouses } from "@/lib/warehouses-actions";
import { Result } from "@/types/api";

interface OrderItem {
  id: string; // temp id for UI
  product_id: string;
  product_name: string;
  sku: string;
  variant_id?: string;
  variant_name?: string;
  quantity_ordered: number;
  unit_cost: number;
  subtotal: number;
}

export default function NewPurchasePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<OrderItem[]>([]);
  
  // Product Search State
  const [productSearch, setProductSearch] = useState("");
  const [isProductListOpen, setIsProductListOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#product-search-container")) {
        setIsProductListOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const workspaceId = workspace?.id;

  // Fetch Suppliers
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

  // Fetch Warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getWarehouses(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Fetch Products for selection
  const { data: productsResult, isLoading: productsLoading } = useQuery({
    queryKey: ["products-search", workspaceId, productSearch],
    queryFn: async () => {
      if (!workspaceId) return { data: [] };
      const result = await getProducts(workspaceId, productSearch);
      return result;
    },
    enabled: !!workspaceId,
  });

  const products = productsResult?.data || [];

  const addItem = (product: any) => {
    const newItem: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      product_id: product.id,
      product_name: product.name,
      sku: product.sku || "N/A",
      quantity_ordered: 1,
      unit_cost: product.cost || 0,
      subtotal: product.cost || 0,
    };
    setItems([...items, newItem]);
    setProductSearch("");
    setIsProductListOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<OrderItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.subtotal = updated.quantity_ordered * updated.unit_cost;
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => items.reduce((acc, item) => acc + item.subtotal, 0);
  const calculateTax = () => calculateSubtotal() * 0.18;
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (!supplierId) throw new Error("Selecciona un proveedor");
      if (!warehouseId) throw new Error("Selecciona un almacén");
      if (items.length === 0) throw new Error("Agrega al menos un producto");

      const data = {
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        expected_date: expectedDate || undefined,
        invoice_number: invoiceNumber || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity_ordered: item.quantity_ordered,
          unit_cost: item.unit_cost,
        })),
      };

      const result = await createPurchaseOrder(workspaceId, data as any);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (order) => {
      toast.success("Orden de compra creada");
      queryClient.invalidateQueries({ queryKey: ["purchases", workspaceId] });
      router.push(`/workspaces/${slug}/purchases/${order.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (workspaceLoading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/workspaces/${slug}/purchases`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva Orden de Compra</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Completa los datos para generar una orden de compra.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="border-none shadow-sm ring-1 ring-border mt-1">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Productos de la Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div id="product-search-container" className="relative mb-6">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar en catálogo por Nombre, SKU o Categoría..." 
                  className="pl-10 h-10 bg-muted/20 border-muted focus:ring-primary/20 placeholder:text-muted-foreground/60"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsProductListOpen(true);
                  }}
                  onFocus={() => setIsProductListOpen(true)}
                />
                
                {isProductListOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {productsLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                      </div>
                    ) : products.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No se encontraron productos</div>
                    ) : (
                      products.map((p: any) => (
                        <div 
                          key={p.id} 
                          className="p-3 hover:bg-muted cursor-pointer transition-colors border-b last:border-0"
                          onClick={() => addItem(p)}
                        >
                          <div className="font-medium flex justify-between">
                            <span>{p.name}</span>
                            {p.category?.name && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                {p.category.name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-muted px-1 rounded uppercase tracking-tighter border">SKU: {p.sku || "N/A"}</span>
                            <span>•</span>
                            <span className="font-bold">S/ {p.cost?.toFixed(2) || "0.00"}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-lg border-2 border-dashed border-muted">
                  <ShoppingCart className="mx-auto size-10 text-muted-foreground opacity-30" />
                  <p className="mt-3 text-muted-foreground font-medium">No has agregado productos a la orden</p>
                  <p className="text-xs text-muted-foreground">Busca productos arriba para empezar</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40%]">Producto</TableHead>
                        <TableHead className="text-center w-[20%]">Cantidad</TableHead>
                        <TableHead className="text-right w-[15%]">Costo Unit.</TableHead>
                        <TableHead className="text-right w-[15%]">Subtotal</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="font-medium text-sm">{item.product_name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SKU: {item.sku}</div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min={1} 
                              value={item.quantity_ordered} 
                              onChange={(e) => updateItem(item.id, { quantity_ordered: parseInt(e.target.value) || 0 })}
                              className="w-20 mx-auto text-center h-9 focus-visible:ring-primary/20"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground text-xs font-bold">S/</span>
                              <Input 
                                type="number" 
                                step="0.01"
                                value={item.unit_cost} 
                                onChange={(e) => updateItem(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                                className="w-24 text-right h-9 focus-visible:ring-primary/20"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            S/ {item.subtotal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Notas Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea 
                placeholder="Ingresa cualquier observación o detalle adicional para el proveedor o uso interno..." 
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none focus-visible:ring-primary/20"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border-none shadow-sm ring-1 ring-border sticky top-6">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proveedor *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-11 bg-muted/20 border-muted">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recibir en Almacén *</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="h-11 bg-muted/20 border-muted">
                    <SelectValue placeholder="Seleccionar almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha Estimada</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    value={expectedDate} 
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="h-11 pl-10 bg-muted/20 border-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">N° Factura / Referencia</Label>
                <Input 
                  placeholder="Ej. FAC-001-123" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="h-11 bg-muted/20 border-muted font-mono"
                />
              </div>

              <Separator className="my-2" />

              <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-dashed border-muted">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-semibold text-sm">S/ {calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                    IGV <span className="text-[10px] bg-muted-foreground/10 px-1 rounded">18%</span>
                  </span>
                  <span className="font-semibold text-sm">S/ {calculateTax().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-base">Total</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs font-bold">S/</span>
                    <span className="font-bold text-xl text-primary">{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.01]" 
                disabled={!supplierId || !warehouseId || items.length === 0 || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generando Orden...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Generar Orden de Compra
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
