"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { Workspace, updateWorkspace, deleteWorkspace } from "@/lib/workspace-actions";
import { usePermissions } from "@/hooks/use-permissions";
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

interface WorkspaceSettingsProps {
    workspace: Workspace;
    currentUserId: string;
}

export function WorkspaceSettings({
    workspace,
}: WorkspaceSettingsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [formData, setFormData] = useState({
        name: workspace.name,
        phone: workspace.phone || "",
        website: workspace.website || "",
    });

    const { isAdmin, canDeleteWorkspace } = usePermissions(workspace);

    const handleSave = async () => {
        setIsLoading(true);
        const result = await updateWorkspace(workspace.id, {
            name: formData.name,
            phone: formData.phone,
            website: formData.website,
        });

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Configuración actualizada");
            router.refresh();
        }
        setIsLoading(false);
    };

    const handleDelete = async () => {
        if (deleteConfirmation !== workspace.name) {
            toast.error("El nombre no coincide");
            return;
        }

        setIsDeleting(true);
        const result = await deleteWorkspace(workspace.id);

        if (result.error) {
            toast.error(result.error);
            setIsDeleting(false);
        } else {
            toast.success("Workspace eliminado permanentemente");
            router.push("/workspaces");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardContent className="flex flex-col p-6 gap-8">
                    <div className="flex flex-col gap-4">
                        <Label htmlFor="name">Nombre del Workspace</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            disabled={!isAdmin}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <PhoneInput
                            id="phone"
                            value={formData.phone}
                            onChange={(value) => setFormData(prev => ({ ...prev, phone: value || "" }))}
                            disabled={!isAdmin}
                            defaultCountry="PE"
                            placeholder="Ingresa tu número de teléfono"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="website">Sitio Web</Label>
                        <Input
                            id="website"
                            type="url"
                            placeholder="https://ejemplo.com"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            disabled={!isAdmin}
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Guardar cambios
                            </Button>
                        </div>
                    )}

                    {!isAdmin && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                            <Settings className="size-4" />
                            <span>Solo administradores pueden editar la configuración</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Zona de Peligro - Solo para Owner */}
            {canDeleteWorkspace && (
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Zona de Peligro
                        </CardTitle>
                        <CardDescription>
                            Eliminar este proyecto es una acción permanente que elimina los datos, 
                            los registros, las configuraciones y los recursos relacionados del proyecto.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            className="gap-2"
                        >
                            <Trash2 className="size-4" />
                            Eliminar Proyecto
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Diálogo de Confirmación de Eliminación */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            ¿Eliminar proyecto permanentemente?
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="flex flex-col text-sm text-muted-foreground gap-4">
                                <p>
                                    Esta acción <strong>NO se puede deshacer</strong>. Esto eliminará permanentemente:
                                </p>
                                <ul className="flex flex-col list-disc list-inside gap-1">
                                    <li>Todas las instancias del proyecto</li>
                                    <li>Todos los miembros y sus roles</li>
                                    <li>Todos los registros de auditoría</li>
                                    <li>Configuraciones de billing y suscripciones</li>
                                </ul>
                                <div className="flex flex-col pt-4 gap-2">
                                    <p className="font-medium">
                                        Escribe <code className="bg-muted px-1 py-0.5 rounded">{workspace.name}</code> para confirmar:
                                    </p>
                                    <Input
                                        value={deleteConfirmation}
                                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                                        placeholder={`Escribe "${workspace.name}" para confirmar`}
                                        className="border-destructive/50 focus-visible:ring-destructive"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setDeleteConfirmation("");
                            setShowDeleteDialog(false);
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteConfirmation !== workspace.name || isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 size-4" />
                                    Eliminar Permanentemente
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
