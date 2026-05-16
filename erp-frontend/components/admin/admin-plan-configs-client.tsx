"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Edit2, Trash2, Tag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminPlanConfig } from "@/lib/admin-actions";
import { createAdminPlan, updateAdminPlan, deleteAdminPlan } from "@/lib/admin-actions";

export function AdminPlanConfigsClient({ initialPlans }: { initialPlans: AdminPlanConfig[] }) {
    const [plans, setPlans] = useState<AdminPlanConfig[]>(initialPlans);
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<AdminPlanConfig>>({
        name: "", slug: "", price: 0, is_active: true, features: []
    });
    const [featuresText, setFeaturesText] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<AdminPlanConfig | null>(null);

    const handleOpenCreate = () => {
        setFormData({ name: "", slug: "", price: 0, is_active: true, features: [] });
        setFeaturesText("");
        setIsEditing(false);
        setIsOpen(true);
    };

    const handleOpenEdit = (plan: AdminPlanConfig) => {
        setFormData(plan);
        setFeaturesText(plan.features?.join("\n") || "");
        setIsEditing(true);
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        const payload = {
            ...formData,
            features: featuresText.split("\n").filter(f => f.trim() !== "")
        };

        if (isEditing && formData.id) {
            const result = await updateAdminPlan(formData.id, payload);
            if (result.success) {
                setPlans(plans.map(p => p.id === formData.id ? result.data! : p));
                toast.success("Plan actualizado correctamente");
                setIsOpen(false);
            } else {
                toast.error(result.error);
            }
        } else {
            const result = await createAdminPlan(payload);
            if (result.success) {
                setPlans([...plans, result.data!]);
                toast.success("Plan creado correctamente");
                setIsOpen(false);
            } else {
                toast.error(result.error);
            }
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        const result = await deleteAdminPlan(planToDelete.id);
        if (result.success) {
            setPlans(plans.filter(p => p.id !== planToDelete.id));
            toast.success("Plan eliminado correctamente");
        } else {
            // Mensaje específico para planes del sistema
            if (result.error?.includes('system plan') || result.error?.includes('Cannot delete')) {
                toast.error("No se puede eliminar un plan del sistema");
            } else {
                toast.error(result.error || "Error al eliminar plan");
            }
        }
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag className="size-8 text-muted-foreground" />
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Planes Base</h2>
                        <p className="text-muted-foreground">
                            Administra los precios, características e integraciones de Stripe para los planes base
                        </p>
                    </div>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="mr-2 size-4" /> Nuevo Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isEditing ? "Editar Plan" : "Crear Nuevo Plan"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>Nombre</Label>
                                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Pro" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Slug (ID único)</Label>
                                    <Input value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="Ej: pro" disabled={isEditing} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <Label>Precio ($)</Label>
                                    <Input type="number" value={Number.isNaN(formData.price) ? "" : formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label>Stripe Price ID</Label>
                                    <Input value={formData.stripe_price_id || ""} onChange={e => setFormData({ ...formData, stripe_price_id: e.target.value })} placeholder="price_123..." />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label>Funcionalidades (Una por línea)</Label>
                                <Textarea
                                    value={featuresText} 
                                    onChange={e => setFeaturesText(e.target.value)}
                                    placeholder="Característica 1&#10;Característica 2"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Plan Activo (Visible para usuarios)</Label>
                                <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSubmit}>{isEditing ? "Guardar Cambios" : "Crear"}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Plan</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Stripe ID</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12">
                                    <Tag className="mx-auto size-12 text-muted-foreground opacity-50" />
                                    <h3 className="mt-4 text-lg font-medium">No hay planes</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Crea tu primer plan para configurar precios.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                                <TableRow key={plan.id}>
                                    <TableCell>
                                        <div className="font-medium">{plan.name}</div>
                                        <div className="text-xs text-muted-foreground">{plan.slug}</div>
                                    </TableCell>
                                    <TableCell>${plan.price}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {plan.stripe_price_id || "No configurado"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                                            {plan.is_active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenEdit(plan)}>
                                                    <Edit2 className="size-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => {
                                                        setPlanToDelete(plan);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="size-4 mr-2" />
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
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro? Se eliminará permanentemente el plan &quot;{planToDelete?.name}&quot;. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
