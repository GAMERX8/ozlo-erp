"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package, AlertTriangle, Warehouse as WarehouseIcon, ArrowUpDown, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getProducts, getWarehouses, getLowStockAlerts, getKardex } from "@/lib/clients-actions";
import { KardexView } from "@/components/logistics/KardexView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InventoryPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const workspaceId = workspace?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getProducts(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ["warehouses", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getWarehouses(workspaceId);
      if (!result.success) throw new Error(result.error);
      return (result.data || []).filter((w: any) => w.is_active !== false);
    },
    enabled: !!workspaceId,
  });



  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredProducts = (products || [])
    .filter((p: any) => {
      // Solo mostrar productos que tengan registros en inventario (hayan tenido stock o movimientos)
      const hasInventory = p.inventory && p.inventory.length > 0;
      
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        
      return matchesSearch && (hasInventory || (p.total_stock && p.total_stock > 0));
    })
    .sort((a: any, b: any) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    }) || [];

  const openKardex = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setIsKardexOpen(true);
  };

  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter((p: any) => p.status === "active").length || 0;
  const totalStockUnits = products?.reduce((sum: number, p: any) => {
    const productStock = p.inventory?.reduce((s: number, i: any) => s + (i.stock || 0), 0) ?? p.total_stock ?? 0;
    return sum + (productStock || 0);
  }, 0) || 0;

  if (workspaceLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Consulta el stock actual de tus productos y recibe alertas.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{activeProducts} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenes</CardTitle>
            <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">ubicaciones de stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockUnits}</div>
            <p className="text-xs text-muted-foreground">cantidad física total</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
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
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1">Producto <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("price")}>
                    <div className="flex items-center justify-end gap-1">Precio <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead>Stock Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Package className="mx-auto size-12 text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">
                        {searchTerm ? "No hay resultados" : "No hay productos"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchTerm ? "Intenta con otro término de búsqueda." : "Agrega productos para ver su stock aquí."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: any) => {
                    const totalStock = product.inventory?.reduce?.(
                      (sum: number, inv: any) => sum + (inv.stock || 0),
                      0
                    ) ?? product.total_stock ?? 0;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          S/ {Number(product.price || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {totalStock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === "active" ? "default" : "secondary"}>
                            {product.status === "active" ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openKardex(product.id, product.name)}
                          >
                            Kardex
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
      </div>

      <Dialog open={isKardexOpen} onOpenChange={setIsKardexOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Historial de Movimientos: {selectedProductName}
            </DialogTitle>
          </DialogHeader>
          {selectedProductId && workspaceId && (
            <KardexLoader productId={selectedProductId} workspaceId={workspaceId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KardexLoader({ productId, workspaceId }: { productId: string; workspaceId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["kardex", productId, workspaceId],
    queryFn: async () => {
      const result = await getKardex(workspaceId, productId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!productId && !!workspaceId,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data?.length) return (
    <div className="text-center py-12">
      <FileText className="mx-auto size-12 text-muted-foreground opacity-50" />
      <h3 className="mt-4 text-lg font-medium">Sin movimientos</h3>
      <p className="text-sm text-muted-foreground mt-1">No hay movimientos registrados.</p>
    </div>
  );
  return <KardexView movements={data} />;
}