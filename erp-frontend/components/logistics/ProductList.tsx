'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Package, History, Trash2 } from 'lucide-react';
import { Product } from '@/types/logistics';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

export function ProductList({ products, onEdit }: ProductListProps) {
  const calculateTotalStock = (product: Product) => {
    return product.inventory.reduce((acc, item) => acc + item.stock, 0);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre / SKU</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12">
                <Package className="mx-auto size-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No hay productos</h3>
                <p className="text-sm text-muted-foreground mt-1">Agrega tu primer producto para comenzar.</p>
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const totalStock = calculateTotalStock(product);
              const isLowStock = totalStock <= (product.min_stock || 0);

              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      {product.gallery && product.gallery.length > 0 ? (
                        <div className="size-12 rounded-xl overflow-hidden border bg-muted flex-shrink-0 shadow-sm">
                          <img src={product.gallery[0] as string} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="size-12 rounded-xl border bg-muted/50 flex items-center justify-center flex-shrink-0 border-dashed">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{product.sku || 'Sin SKU'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.category?.name ? (
                      <Badge variant="secondary" className="font-normal">
                        {product.category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'outline' : 'secondary'} className="capitalize">
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
