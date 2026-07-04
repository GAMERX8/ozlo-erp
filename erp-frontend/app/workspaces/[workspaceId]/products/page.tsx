'use client';

import { useEffect, useState, use } from 'react';
import { useLogistics } from '@/hooks/useLogistics';
import { ProductList } from '@/components/logistics/ProductList';
import { ProductForm } from '@/components/logistics/ProductForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, LayoutGrid, Warehouse, UploadCloud, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { Product } from '@/types/logistics';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useRef } from 'react';

export default function ProductsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: urlWorkspaceId } = use(params);
  const { data: workspace } = useWorkspace(urlWorkspaceId);
  const workspaceId = workspace?.id;
  
  const { fetchProducts, createBulkProducts } = useLogistics(workspaceId || '');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const loadProducts = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadProducts();
    }
  }, [workspaceId]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsProductModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet) as any[];

      const productsToImport = rows.map((row: any) => {
        // Busca una columna "Nombre", "Name" o toma la primera columna disponible
        const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('nombre') || k.toLowerCase().includes('name')) || Object.keys(row)[0];
        return {
          name: row[nameKey] ? String(row[nameKey]) : '',
        };
      }).filter(p => p.name.trim() !== '');

      if (productsToImport.length === 0) {
        toast.error('No se encontraron productos válidos en el archivo');
        return;
      }

      // TODO: Here we need createBulkProducts from useLogistics, wait, useLogistics exposes it.
      // Wait, let's just use it directly or from hook.
      // I need to import createBulkProducts or extract it from useLogistics.
      await createBulkProducts(productsToImport);
      toast.success(`${productsToImport.length} productos importados correctamente`);
      loadProducts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al importar el archivo Excel');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && !products.length) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus productos y categorías.</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces/${urlWorkspaceId}/categories`}>
              <LayoutGrid className="mr-2 h-4 w-4" /> Categorías
            </Link>
          </Button>
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700 text-white" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Importar Excel
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces/${urlWorkspaceId}/warehouses`}>
              <Warehouse className="mr-2 h-4 w-4" /> Almacenes
            </Link>
          </Button>
          <Button onClick={handleNewProduct} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      <ProductList 
        products={products} 
        onEdit={handleEdit} 
      />

      {/* Modal de Producto */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          {workspaceId && (
            <ProductForm 
              workspaceId={workspaceId} 
              onSuccess={(stayOpen) => {
                if (!stayOpen) setIsProductModalOpen(false);
                loadProducts();
              }}
              initialData={selectedProduct}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
