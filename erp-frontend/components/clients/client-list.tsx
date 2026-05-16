"use client";

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Trash2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientListProps {
  clients: any[];
  onEdit: (client: any) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

/**
 * Formatea la ubicación del cliente
 */
const formatLocation = (client: any) => {
  if (!client) return "-";
  
  const parts = [];
  
  // Agregar distrito si existe
  if (client.district?.name) {
    parts.push(client.district.name);
  } else if (client.district_id && typeof client.district === 'string') {
    // Caso de respaldo si el objeto no está expandido
    parts.push(client.district);
  }
  
  // Agregar provincia si existe y es diferente al distrito
  const provinceName = client.province?.name || (typeof client.province === 'string' ? client.province : null);
  if (provinceName && provinceName !== (client.district?.name || client.district)) {
    parts.push(provinceName);
  }
  
  // Agregar departamento si existe
  const departmentName = client.department?.name || (typeof client.department === 'string' ? client.department : null);
  if (departmentName && !parts.includes(departmentName)) {
    parts.push(departmentName);
  }
  
  if (parts.length > 0) {
    return parts.join(", ");
  }
  
  return client.address || "-";
};

export function ClientList({ clients, onEdit, onDelete, loading }: ClientListProps) {
  if (loading) {
// ...
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre / Razón Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="animate-pulse h-4 bg-muted rounded w-3/4 mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre / Razón Social</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[80px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12">
                <Users className="mx-auto size-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No hay clientes</h3>
                <p className="text-sm text-muted-foreground mt-1">No se encontraron clientes registrados.</p>
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-1">{client.document_type}:</span>
                    {client.document_number || "-"}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {client.phone || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{formatLocation(client)}</span>
                    </div>
                    {client.reference && (
                      <span className="text-xs text-muted-foreground pl-4">{client.reference}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={client.status === "active" ? "default" : "secondary"}>
                    {client.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(client)}>
                        <FileText className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(client.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar
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
  );
}