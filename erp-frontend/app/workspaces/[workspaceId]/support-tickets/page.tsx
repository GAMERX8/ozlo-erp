"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  HelpCircle,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Actions & Types
import {
  getSupportTickets,
  createSupportTicket,
  deleteSupportTicket,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type TicketType,
  type CreateTicketData,
} from "@/lib/support-tickets-actions";

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En Progreso" },
  { value: "waiting", label: "En Espera" },
  { value: "resolved", label: "Resuelto" },
  { value: "closed", label: "Cerrado" },
];

const priorityOptions = [
  { value: "all", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const typeOptions = [
  { value: "all", label: "Todos" },
  { value: "question", label: "Pregunta" },
  { value: "incident", label: "Incidente" },
  { value: "problem", label: "Problema" },
  { value: "feature_request", label: "Solicitud" },
  { value: "complaint", label: "Reclamo" },
];

const statusLabels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En Progreso",
  waiting: "En Espera",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const typeLabels: Record<TicketType, string> = {
  question: "Pregunta",
  incident: "Incidente",
  problem: "Problema",
  feature_request: "Solicitud",
  complaint: "Reclamo",
};

const statusBadgeVariants: Record<TicketStatus, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  waiting: "outline",
  resolved: "default",
  closed: "secondary",
};

const priorityBadgeVariants: Record<TicketPriority, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  urgent: "destructive",
};

export default function SupportTicketsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(null);

  const [formData, setFormData] = useState<CreateTicketData>({
    title: "",
    description: "",
    priority: "medium",
    type: "incident",
  });

  const workspaceId = workspace?.id;

  // Query para obtener tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets", workspaceId, statusFilter, priorityFilter, typeFilter, searchTerm, currentPage],
    queryFn: async () => {
      if (!workspaceId) return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      
      const filters: {
        status?: TicketStatus | TicketStatus[];
        priority?: TicketPriority | TicketPriority[];
        type?: TicketType | TicketType[];
        search?: string;
        page: number;
        limit: number;
      } = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (statusFilter !== "all") filters.status = statusFilter as TicketStatus;
      if (priorityFilter !== "all") filters.priority = priorityFilter as TicketPriority;
      if (typeFilter !== "all") filters.type = typeFilter as TicketType;
      if (searchTerm) filters.search = searchTerm;

      const result = await getSupportTickets(workspaceId, filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!workspaceId,
  });

  // Mutación para crear ticket
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      const result = await createSupportTicket(workspaceId, formData);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Ticket creado exitosamente");
      setIsCreateModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["support-tickets", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutación para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !deletingTicket) throw new Error("Datos incompletos");
      const result = await deleteSupportTicket(deletingTicket.id, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Ticket eliminado");
      setIsDeleteModalOpen(false);
      setDeletingTicket(null);
      queryClient.invalidateQueries({ queryKey: ["support-tickets", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      type: "incident",
    });
  };

  const openDeleteModal = (ticket: SupportTicket) => {
    setDeletingTicket(ticket);
    setIsDeleteModalOpen(true);
  };

  const tickets = ticketsData?.data || [];
  const totalPages = ticketsData?.meta?.totalPages || 1;

  // Contar tickets por estado
  const openCount = tickets.filter((t: SupportTicket) => t.status === "open" || t.status === "in_progress").length;
  const urgentCount = tickets.filter((t: SupportTicket) => t.priority === "urgent" || t.priority === "high").length;

  if (workspaceLoading) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="text-center py-12">
          <HelpCircle className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets de Soporte</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los tickets de soporte y seguimiento de incidencias.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketsData?.meta?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgentes/Altos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets.filter((t: SupportTicket) => t.status === "resolved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tickets..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Ticket</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Asignado a</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <HelpCircle className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">
                    {searchTerm ? "No hay resultados" : "No hay tickets"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Intenta con otro término de búsqueda." : "Crea tu primer ticket de soporte."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket: SupportTicket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                      {ticket.ticket_number}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {ticket.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{typeLabels[ticket.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityBadgeVariants[ticket.priority]}>
                      {priorityLabels[ticket.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariants[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.assigned_to_user ? (
                      <span className="text-sm">
                        {ticket.assigned_to_user.first_name} {ticket.assigned_to_user.last_name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleDateString("es-PE")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/workspaces/${slug}/support-tickets/${ticket.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => openDeleteModal(ticket)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Ticket de Soporte</DialogTitle>
            <DialogDescription>
              Crea un nuevo ticket para reportar un incidente o solicitar ayuda.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resumen del problema"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripción *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el problema o solicitud en detalle"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v as TicketType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="question">Pregunta</SelectItem>
                    <SelectItem value="incident">Incidente</SelectItem>
                    <SelectItem value="problem">Problema</SelectItem>
                    <SelectItem value="feature_request">Solicitud</SelectItem>
                    <SelectItem value="complaint">Reclamo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as TicketPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!formData.title || !formData.description || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Crear Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Ticket</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar el ticket {deletingTicket?.ticket_number}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
