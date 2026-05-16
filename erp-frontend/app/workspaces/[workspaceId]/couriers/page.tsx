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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Icons
import {
  Plus,
  Search,
  MoreHorizontal,
  Truck,
  Phone,
  Mail,
  Package,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Loader2,
  User,
  Car,
} from "lucide-react";

// Actions
import {
  getCouriers,
  getAllCouriersStats,
  createCourier,
  updateCourier,
  deleteCourier,
  type Courier,
  type CreateCourierData,
} from "@/lib/couriers-actions";

export default function CouriersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [deletingCourier, setDeletingCourier] = useState<Courier | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCourierData>({
    name: "",
    phone: "",
    email: "",
    document_type: "dni",
    document_number: "",
    vehicle_type: "",
    license_plate: "",
  });

  const workspaceId = workspace?.id;

  // Query para obtener couriers
  const { data: couriers, isLoading: couriersLoading } = useQuery({
    queryKey: ["couriers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getCouriers(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ["couriers-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getAllCouriersStats(workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    enabled: !!workspaceId,
  });

  // Mutación para crear/editar
  const saveMutation = useMutation({
    mutationFn: async () => {
      console.log('--- Frontend Save Mutation ---');
      console.log('Workspace ID (UUID):', workspaceId);
      console.log('Slug from Params:', slug);
      console.log('Form Data:', formData);

      if (!workspaceId) throw new Error("No workspace ID found (UUID is missing)");
      
      if (editingCourier) {
        const result = await updateCourier(editingCourier.id, workspaceId, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      } else {
        const result = await createCourier(workspaceId, formData);
        if (!result.success) throw new Error(result.error);
        return result.data;
      }
    },
    onSuccess: (data) => {
      console.log('--- Mutation Success ---');
      console.log('Created/Updated Courier:', data);
      toast.success(editingCourier ? "Courier actualizado" : "Courier creado");
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["couriers", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["couriers-stats", workspaceId] });
    },
    onError: (error: Error) => {
      console.error('--- Mutation Error ---');
      console.error(error);
      toast.error(error.message);
    },
  });

  // Mutación para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !deletingCourier) throw new Error("Datos incompletos");
      const result = await deleteCourier(deletingCourier.id, workspaceId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Courier eliminado");
      setIsDeleteModalOpen(false);
      setDeletingCourier(null);
      queryClient.invalidateQueries({ queryKey: ["couriers", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["couriers-stats", workspaceId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      document_type: "dni",
      document_number: "",
      vehicle_type: "",
      license_plate: "",
    });
    setEditingCourier(null);
  };

  const openEditModal = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      phone: courier.phone || "",
      email: courier.email || "",
      document_type: courier.document_type || "dni",
      document_number: courier.document_number || "",
      vehicle_type: courier.vehicle_type || "",
      license_plate: courier.license_plate || "",
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (courier: Courier) => {
    setDeletingCourier(courier);
    setIsDeleteModalOpen(true);
  };

  const getCourierStats = (courierId: string) => {
    return stats?.find((s: { courier_id: string }) => s.courier_id === courierId);
  };

  const filteredCouriers = couriers?.filter((c: Courier) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
          <Truck className="mx-auto size-12 text-muted-foreground opacity-50" />
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
          <h1 className="text-2xl font-bold tracking-tight">Couriers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona los couriers y revisa sus estadísticas de entrega.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Courier
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Couriers</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{couriers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entregas</CardTitle>
              <Package className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.reduce((acc: number, s: { total_orders: number }) => acc + (Number(s.total_orders) || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregados</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.reduce((acc: number, s: { delivered_orders: number }) => acc + (Number(s.delivered_orders) || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Éxito Promedio</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.length > 0
                  ? `${Math.round(
                      stats.reduce((acc: number, s: { delivery_rate: number }) => acc + (Number(s.delivery_rate) || 0), 0) /
                        stats.length
                    )}%`
                  : "0%"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar couriers..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Courier</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Órdenes Asignadas</TableHead>
              <TableHead>Entregadas</TableHead>
              <TableHead>Tasa de Éxito</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couriersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredCouriers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Truck className="mx-auto size-12 text-muted-foreground opacity-50" />
                  <h3 className="mt-4 text-lg font-medium">No hay couriers</h3>
                  <p className="text-muted-foreground mt-1">
                    {searchTerm ? "No se encontraron couriers con ese criterio." : "Agrega tu primer courier para empezar."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredCouriers.map((courier: Courier) => {
                const courierStats = getCourierStats(courier.id);
                return (
                  <TableRow key={courier.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{courier.name}</div>
                          {courier.document_number && (
                            <div className="text-xs text-muted-foreground">
                              {courier.document_type?.toUpperCase()}: {courier.document_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {courier.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {courier.phone}
                          </div>
                        )}
                        {courier.email && (
                          <div className="text-sm flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {courier.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {courier.vehicle_type ? (
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{courier.vehicle_type}</span>
                          {courier.license_plate && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({courier.license_plate})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{courierStats?.total_orders || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-emerald-600">
                        {courierStats?.delivered_orders || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={courierStats?.delivery_rate && courierStats.delivery_rate >= 80 ? "default" : "secondary"}>
                        {courierStats?.delivery_rate || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={courier.is_active ? "default" : "secondary"}>
                        {courier.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(courier)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteModal(courier)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de creación/edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCourier ? "Editar Courier" : "Nuevo Courier"}
            </DialogTitle>
            <DialogDescription>
              {editingCourier
                ? "Actualiza la información del courier."
                : "Completa los datos para crear un nuevo courier."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="999 999 999"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dni">DNI</SelectItem>
                    <SelectItem value="ruc">RUC</SelectItem>
                    <SelectItem value="ce">CE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de Documento</Label>
                <Input
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  placeholder="Número"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Vehículo</Label>
                <Input
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  placeholder="Moto, Auto, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  placeholder="ABC-123"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingCourier ? "Guardar Cambios" : "Crear Courier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Courier</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a {deletingCourier?.name}? Esta acción no se puede deshacer.
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
