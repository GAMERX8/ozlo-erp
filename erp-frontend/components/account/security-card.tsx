"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/lib/profile-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";

interface SecurityCardProps {
    provider?: string;
}

export function SecurityCard({ provider }: SecurityCardProps) {
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const isCredentialsProvider = provider === "credentials" || !provider;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handlePasswordChange = async () => {
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        if (formData.newPassword.length < 8) {
            toast.error("La nueva contraseña debe tener al menos 8 caracteres");
            return;
        }

        startTransition(async () => {
            const result = await changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Contraseña actualizada exitosamente");
                setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                });
                setOpen(false);
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Seguridad de la Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {/* Provider Info */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {isCredentialsProvider ? (
                                <KeyRound className="size-5 text-primary" />
                            ) : (
                                <Mail className="size-5 text-primary" />
                            )}
                        </div>
                        <div>
                            <p className="font-medium">Proveedor de autenticación</p>
                            <p className="text-sm text-muted-foreground">
                                {isCredentialsProvider
                                    ? "Email y contraseña"
                                    : provider === "google"
                                    ? "Google"
                                    : provider}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Password Section (only for credentials provider) */}
                {isCredentialsProvider && (
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                                <Lock className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium">Contraseña</p>
                                <p className="text-sm text-muted-foreground">••••••••</p>
                            </div>
                        </div>

                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Cambiar contraseña
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Cambiar contraseña</DialogTitle>
                                    <DialogDescription>
                                        Ingresa tu contraseña actual y la nueva contraseña para actualizarla.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex flex-col py-4 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="currentPassword">
                                            Contraseña actual
                                        </Label>
                                        <PasswordInput
                                            id="currentPassword"
                                            name="currentPassword"
                                            placeholder="••••••••"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="newPassword">
                                            Nueva contraseña
                                        </Label>
                                        <PasswordInput
                                            id="newPassword"
                                            name="newPassword"
                                            placeholder="••••••••"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="confirmPassword">
                                            Confirmar contraseña
                                        </Label>
                                        <PasswordInput
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                        disabled={isPending}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handlePasswordChange}
                                        disabled={
                                            isPending ||
                                            !formData.currentPassword ||
                                            !formData.newPassword ||
                                            !formData.confirmPassword
                                        }
                                    >
                                        {isPending
                                            ? "Actualizando..."
                                            : "Guardar cambios"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
