"use client";

import { useState, use } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  ArrowLeft,
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Edit3,
  Lock,
} from "lucide-react";

// Actions & Types
import {
  getSupportTicket,
  getTicketComments,
  addTicketComment,
  updateSupportTicket,
  assignTicket,
  resolveTicket,
  closeTicket,
  reopenTicket,
  type SupportTicket,
  type TicketComment,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/support-tickets-actions";

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

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string; ticketId: string }>;
}) {
  const { workspaceId: slug, ticketId } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const workspaceId = workspace?.id;

  // Query para obtener ticket
  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["support-ticket", ticketId, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getSupportTicket(ticketId, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!workspaceId,
  });

  // Query para obtener comentarios
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getTicketComments(ticketId, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Mutación para agregar comentario
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !newComment.trim()) throw new Error("Datos incompletos");
      const result = await addTicketComment(ticketId, workspaceId, newComment, isInternalComment);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Comentario agregado");
      setNewComment("");
      setIsInternalComment(false);
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId, workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutación para cambiar estado
  const statusMutation = useMutation({
    mutationFn: async ({ action, notes }: { action: string; notes?: string }) => {
      if (!workspaceId) throw new Error("No workspace");
      let result;
      switch (action) {
        case "resolve":
          result = await resolveTicket(ticketId, workspaceId, notes || "");
          break;
        case "close":
          result = await closeTicket(ticketId, workspaceId);
          break;
        case "reopen":
          result = await reopenTicket(ticketId, workspaceId);
          break;
        default:
          throw new Error("Acción no válida");
      }
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "resolve"
          ? "Ticket resuelto"
          : variables.action === "close"
          ? "Ticket cerrado"
          : "Ticket reabierto"
      );
      setIsResolveModalOpen(false);
      setIsCloseModalOpen(false);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId, workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Mutación para cambiar prioridad
  const priorityMutation = useMutation({
    mutationFn: async (priority: TicketPriority) => {
      if (!workspaceId) throw new Error("No workspace");
      const result = await updateSupportTicket(ticketId, workspaceId, { priority });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Prioridad actualizada");
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId, workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case "created":
        return <HelpCircle className="h-4 w-4" />;
      case "status_changed":
        return <Edit3 className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "closed":
        return <Lock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (workspaceLoading || ticketLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!workspace || !ticket) {
    return (
      <div className="flex flex-col items-center py-12">
          <HelpCircle className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Ticket no encontrado</h3>
        </div>
    );
  }

  const canResolve = ticket.status !== "resolved" && ticket.status !== "closed";
  const canClose = ticket.status !== "closed";
  const canReopen = ticket.status === "resolved" || ticket.status === "closed";

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/workspaces/${slug}/support-tickets`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{ticket.title}</h1>
              <Badge variant={statusBadgeVariants[ticket.status]}>
                {statusLabels[ticket.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ticket.ticket_number} • Creado el {formatDate(ticket.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canReopen && (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate({ action: "reopen" })}
              disabled={statusMutation.isPending}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Reabrir
            </Button>
          )}
          {canResolve && (
            <Button
              variant="default"
              onClick={() => setIsResolveModalOpen(true)}
              disabled={statusMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Resolver
            </Button>
          )}
          {canClose && (
            <Button
              variant="outline"
              onClick={() => setIsCloseModalOpen(true)}
              disabled={statusMutation.isPending}
            >
              <Lock className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Comentarios</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ScrollArea className="h-[300px] pr-4">
                {commentsLoading ? (
<div className="flex flex-col gap-4">
                     {Array.from({ length: 3 }).map((_, i) => (
                       <Skeleton key={i} className="h-20 w-full" />
                     ))}
                   </div>
                ) : comments && comments.length > 0 ? (
<div className="flex flex-col gap-4">
                     {comments.map((comment: TicketComment) => (
<Card key={comment.id} className={comment.is_internal ? "border-yellow-200" : ""}>
                        <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {comment.created_by_user?.first_name?.[0] ||
                                comment.created_by_user?.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {comment.created_by_user?.first_name}{" "}
                                {comment.created_by_user?.last_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(comment.created_at)}
                              </span>
                              {comment.is_internal && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Interno
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="mx-auto size-12 text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-medium">Sin comentarios</h3>
                    <p className="text-sm text-muted-foreground mt-1">No hay comentarios aún.</p>
                  </div>
                )}
              </ScrollArea>

              {/* Add Comment */}
              {ticket.status !== "closed" && (
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={isInternalComment}
                        onCheckedChange={(checked) => setIsInternalComment(checked === true)}
                      />
                      <Lock className="h-3 w-3" />
                      Comentario interno
                    </Label>
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label className="text-muted-foreground">Prioridad</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => priorityMutation.mutate(v as TicketPriority)}
                  disabled={priorityMutation.isPending || ticket.status === "closed"}
                >
                  <SelectTrigger className="mt-1">
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

              <div>
                <Label className="text-muted-foreground">Tipo</Label>
                <p className="text-sm font-medium mt-1">{ticket.type}</p>
              </div>

              <Separator />

              <div>
                <Label className="text-muted-foreground">Creado por</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ticket.created_by_user?.first_name} {ticket.created_by_user?.last_name}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Asignado a</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ticket.assigned_to_user
                      ? `${ticket.assigned_to_user.first_name} ${ticket.assigned_to_user.last_name}`
                      : "Sin asignar"}
                  </span>
                </div>
              </div>

              {ticket.resolved_at && (
                <div>
                  <Label className="text-muted-foreground">Resuelto el</Label>
                  <p className="text-sm mt-1">{formatDate(ticket.resolved_at)}</p>
                </div>
              )}

              {ticket.closed_at && (
                <div>
                  <Label className="text-muted-foreground">Cerrado el</Label>
                  <p className="text-sm mt-1">{formatDate(ticket.closed_at)}</p>
                </div>
              )}

              {ticket.resolution_notes && (
                <div>
                  <Label className="text-muted-foreground">Notas de Resolución</Label>
                  <p className="text-sm mt-1">{ticket.resolution_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
<div className="flex flex-col gap-4">
                 <div className="flex gap-3">
                   <div className="mt-1">{getTimelineIcon("created")}</div>
                  <div>
                    <p className="text-sm font-medium">Ticket creado</p>
                    <p className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
                  </div>
                </div>
                {ticket.status !== "open" && (
                  <div className="flex gap-3">
                    <div className="mt-1">{getTimelineIcon("status_changed")}</div>
                    <div>
                      <p className="text-sm font-medium">Estado cambiado a {statusLabels[ticket.status]}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(ticket.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de resolución */}
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Ticket</DialogTitle>
            <DialogDescription>
              Agrega notas sobre cómo se resolvió el ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Notas de Resolución</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe la solución aplicada..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => statusMutation.mutate({ action: "resolve", notes: resolutionNotes })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Resolver Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de cierre */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Ticket</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de cerrar este ticket? No se podrán agregar más comentarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={() => statusMutation.mutate({ action: "close" })}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cerrar Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
