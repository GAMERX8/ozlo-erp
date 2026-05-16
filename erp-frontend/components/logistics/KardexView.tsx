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
import { StockMovement } from '@/types/logistics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Settings, FileText } from 'lucide-react';

interface KardexViewProps {
  movements: StockMovement[];
}

export function KardexView({ movements }: KardexViewProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'IN': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'OUT': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'TRANSFER': return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      case 'ADJUSTMENT': return <Settings className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'IN': return 'success';
      case 'OUT': return 'destructive';
      case 'TRANSFER': return 'outline';
      case 'ADJUSTMENT': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Razón</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <FileText className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">Sin movimientos</h3>
                  <p className="text-sm text-muted-foreground mt-1">No hay movimientos registrados para este producto.</p>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(movement.date_created), 'dd MMM yyyy, HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{movement.warehouse?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getIcon(movement.type)}
                      <span className="text-sm font-medium">{movement.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={movement.reason}>
                    {movement.reason || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
