"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { ClientForm } from "@/components/clients/client-form";
import { ClientList } from "@/components/clients/client-list";
import { Button } from "@/components/ui/button";
import { Plus, Users, Search } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getClients, deleteClient } from "@/lib/clients-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ClientsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const result = await getClients(workspace.id);
      if (!result.success) {
        toast.error(result.error);
        return [];
      }
      return result.data;
    },
    enabled: !!workspace?.id,
  });

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const client = clients.find((c: any) => c.id === id);
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workspace?.id || !clientToDelete) return;
    setIsDeleting(true);
    const result = await deleteClient(workspace.id, clientToDelete.id);
    if (result.success) {
      toast.success("Cliente eliminado");
      queryClient.invalidateQueries({ queryKey: ["clients", workspace.id] });
    } else {
      toast.error(result.error || "Error al eliminar el cliente");
    }
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const filteredClients = clients.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document_number.includes(searchTerm)
  );

  if (workspaceLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="text-center py-12">
          <Users className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra la base de datos de tus clientes y sus contactos.
          </p>
        </div>
        <Button onClick={() => {
          setEditingClient(null);
          setIsModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ClientList 
        clients={filteredClients} 
        onEdit={handleEdit} 
        onDelete={handleDeleteClick}
        loading={clientsLoading}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Actualiza la información del cliente." : "Completa los datos para crear un nuevo cliente."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            workspaceId={workspace?.id || ""} 
            initialData={editingClient}
            onSuccess={() => {
              setIsModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ["clients", workspace?.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el cliente &quot;{clientToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}