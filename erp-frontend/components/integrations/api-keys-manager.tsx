"use client";

import { useState } from "react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { 
    Plus, 
    Key, 
    Trash2, 
    Copy, 
    Check, 
    AlertCircle,
    Calendar,
    Loader2,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { ApiKey } from "@/types";
import { createApiKey, revokeApiKey, regenerateApiKey } from "@/lib/api-keys-actions";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ApiKeyManagerProps {
    workspaceId: string;
    initialKeys: ApiKey[];
}

export function ApiKeyManager({ workspaceId, initialKeys }: ApiKeyManagerProps) {
    const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isNewKeyDialogOpen, setIsNewKeyDialogOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRevoking, setIsRevoking] = useState<string | null>(null);
    const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) {
            toast.error("El nombre de la clave es requerido");
            return;
        }

        setIsCreating(true);
        const result = await createApiKey(workspaceId, newKeyName);
        setIsCreating(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.data) {
            setGeneratedKey(result.data.raw_key || null);
            setKeys([result.data, ...keys]);
            setIsCreateDialogOpen(false);
            setIsNewKeyDialogOpen(true);
            setNewKeyName("");
            toast.success("Clave de API generada con éxito");
        }
    };

    const handleRegenerateKey = async (id: string) => {
        if (!confirm("¿Deseas regenerar esta clave? La clave anterior dejará de funcionar inmediatamente y se te mostrará una nueva clave secreta.")) {
            return;
        }

        setIsRegenerating(id);
        const result = await regenerateApiKey(workspaceId, id);
        setIsRegenerating(null);

        if (result.error) {
            toast.error(result.error);
        } else if (result.data) {
            setGeneratedKey(result.data.raw_key || null);
            // Actualizar la lista con los nuevos datos (prefijo, etc)
            setKeys(keys.map(k => k.id === id ? result.data : k));
            setIsNewKeyDialogOpen(true);
            toast.success("Clave de API regenerada con éxito");
        }
    };

    const handleRevokeKey = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas revocar esta clave? Esta acción no se puede deshacer y cualquier aplicación que use esta clave dejará de funcionar.")) {
            return;
        }

        setIsRevoking(id);
        const result = await revokeApiKey(workspaceId, id);
        setIsRevoking(null);

        if (result.error) {
            toast.error(result.error);
        } else {
            setKeys(keys.filter(k => k.id !== id));
            toast.success("Clave revocada correctamente");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copiado al portapapeles");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                        <CardTitle>Claves de API Activadas</CardTitle>
                        <CardDescription>
                            Estas claves permiten el acceso programático a tu workspace.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                        <Plus className="size-4" />
                        Nueva Clave
                    </Button>
                </CardHeader>
                <CardContent>
                    {keys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg border-dashed bg-muted/30">
                            <Key className="size-10 text-muted-foreground mb-4 opacity-20" />
                            <p className="text-sm font-medium">No hay claves de API activas</p>
                            <p className="text-xs text-muted-foreground max-w-[250px] mt-1">
                                Crea una clave para empezar a integrar tus sistemas externos.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Prefijo</TableHead>
                                        <TableHead>Fecha de creación</TableHead>
                                        <TableHead>Último uso</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {keys.map((key) => (
                                        <TableRow key={key.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span>{key.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                                    {key.key_prefix}...
                                                </code>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="size-3" />
                                                    {key.created_at ? (
                                                        formatDistanceToNow(new Date(key.created_at), { addSuffix: true, locale: es })
                                                    ) : (
                                                        "N/A"
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                {key.last_used ? (
                                                    formatDistanceToNow(new Date(key.last_used), { addSuffix: true, locale: es })
                                                ) : (
                                                    <Badge variant="outline" className="font-normal text-[10px]">Nunca utilizado</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                        onClick={() => handleRegenerateKey(key.id)}
                                                        disabled={isRegenerating === key.id || isRevoking === key.id}
                                                        title="Regenerar clave"
                                                    >
                                                        {isRegenerating === key.id ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="size-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRevokeKey(key.id)}
                                                        disabled={isRevoking === key.id || isRegenerating === key.id}
                                                        title="Revocar clave"
                                                    >
                                                        {isRevoking === key.id ? (
                                                            <Loader2 className="size-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="size-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal para crear nueva clave */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generar Nueva Clave de API</DialogTitle>
                        <DialogDescription>
                            Asigna un nombre descriptivo para identificar dónde usarás esta clave.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="key-name">Nombre de la clave</Label>
                            <Input
                                id="key-name"
                                placeholder="Ej: Integración WhatsApp, Bot de Inventario..."
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateKey} disabled={isCreating}>
                            {isCreating && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Generar Clave
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para mostrar la clave generada (solo una vez) */}
            <Dialog open={isNewKeyDialogOpen} onOpenChange={(open) => !open && setIsNewKeyDialogOpen(false)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Check className="size-5 text-primary" />
                            Clave de API Creada
                        </DialogTitle>
                        <DialogDescription className="text-destructive font-medium flex items-center gap-2">
                            <AlertCircle className="size-4" />
                            ¡Importante! Guarda esta clave ahora. No podrás volver a verla.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-4">
                        <div className="grid flex-1 gap-2">
                            <Label htmlFor="apiKey" className="sr-only">Clave</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    readOnly
                                    value={generatedKey || ""}
                                    className="pr-10 font-mono text-sm bg-muted/50 border-primary/20"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => generatedKey && copyToClipboard(generatedKey)}
                                >
                                    {copied ? (
                                        <Check className="size-4 text-primary" />
                                    ) : (
                                        <Copy className="size-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
                        <p>Uso en cabecera HTTP:</p>
                        <code className="block mt-1 font-mono text-[10px] break-all">
                            x-api-key: {generatedKey || "su-clave-aqui"}
                        </code>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button type="button" variant="secondary" onClick={() => setIsNewKeyDialogOpen(false)}>
                            Entendido, la he guardado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
