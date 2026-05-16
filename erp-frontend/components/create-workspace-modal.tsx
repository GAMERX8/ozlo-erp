"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createWorkspace } from "@/lib/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("El nombre es obligatorio");
            return;
        }

        setIsLoading(true);

        try {
            const result = await createWorkspace({
                name: name.trim(),
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Espacio de trabajo creado exitosamente");
                
                // Redirigir al nuevo workspace si tenemos el slug
                if (result.data?.slug) {
                    router.push(`/workspaces/${result.data.slug}`);
                } else {
                    router.refresh();
                }
                
                onClose();
                setName("");
            }
        } catch (error) {
            toast.error("Ocurrió un error inesperado");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Crear Espacio de Trabajo</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col py-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Nombre del Espacio
                        </label>
                        <Input
                            id="name"
                            placeholder="Ej. Mi Empresa, Proyecto X..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary text-primary-foreground" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Creando...
                                </>
                            ) : (
                                "Crear Espacio"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
