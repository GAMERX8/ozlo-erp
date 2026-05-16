"use client";

import { useState, useTransition } from "react";
import { setupMfa, verifyMfa, disableMfa } from "@/lib/profile-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Shield, ShieldAlert, ShieldCheck, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface MfaCardProps {
    mfaEnabled: boolean;
}

export function MfaCard({ mfaEnabled: initialEnabled }: MfaCardProps) {
    const [isPending, startTransition] = useTransition();
    const [mfaEnabled, setMfaEnabled] = useState(initialEnabled);
    const [showSetup, setShowSetup] = useState(false);
    const [showDisable, setShowDisable] = useState(false);
    const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [code, setCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [copied, setCopied] = useState(false);

    const handleStartSetup = async () => {
        startTransition(async () => {
            const result = await setupMfa();
            if (!result.success) {
                toast.error(result.error);
            } else if (result.data) {
                setSetupData(result.data);
                setShowSetup(true);
                setShowDisable(false);
            }
        });
    };

    const handleVerifySetup = async () => {
        if (code.length !== 6) return;

        startTransition(async () => {
            const result = await verifyMfa(code);
            if (!result.success) {
                toast.error(result.error);
            } else {
                toast.success("Autenticación de dos factores activada");
                setMfaEnabled(true);
                setShowSetup(false);
                setSetupData(null);
                setCode("");
            }
        });
    };

    const handleDisableClick = () => {
        setShowDisable(true);
        setShowSetup(false);
        setDisableCode("");
    };

    const handleDisableConfirm = async () => {
        if (disableCode.length < 6) {
            toast.error("Ingresa un código válido");
            return;
        }

        startTransition(async () => {
            const result = await disableMfa(disableCode);
            if (!result.success) {
                toast.error(result.error);
            } else {
                toast.success("Autenticación de dos factores desactivada");
                setMfaEnabled(false);
                setShowDisable(false);
                setDisableCode("");
            }
        });
    };

    const copySecret = () => {
        if (setupData?.secret) {
            navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    {mfaEnabled ? (
                        <ShieldCheck className="size-4 text-green-500" />
                    ) : (
                        <ShieldAlert className="size-4 text-yellow-500" />
                    )}
                    Autenticación de Dos Factores (MFA)
                </CardTitle>
                <CardDescription>
                    Añade una capa extra de seguridad a tu cuenta
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {mfaEnabled && !showSetup && !showDisable && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                        <ShieldCheck className="size-5 text-green-500" />
                        <div className="text-sm">
                            <p className="font-medium text-green-700">
                                MFA está activado
                            </p>
                            <p className="text-green-600">
                                Tu cuenta está protegida con una capa de seguridad adicional.
                            </p>
                        </div>
                    </div>
                )}

                <Dialog open={showSetup} onOpenChange={setShowSetup}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Configurar el 2FA</DialogTitle>
                            <DialogDescription>
                                Usa una aplicación como Google Authenticator o Authy para escanear el código.
                            </DialogDescription>
                        </DialogHeader>

                        {setupData && (
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col items-center gap-4 py-2">
                                    <div className="bg-white p-2 rounded-lg border">
                                        <img src={setupData.qrCode} alt="QR MFA" className="size-40" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-muted-foreground">Código manual</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 text-sm break-all flex items-center">
                                            {setupData.secret}
                                        </div>
                                        <Button size="icon" variant="outline" onClick={copySecret} className="shrink-0">
                                            {copied ? (
                                                <CheckCircle2 className="size-4 text-green-500" />
                                            ) : (
                                                <Copy className="size-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col pt-4 border-t gap-4">
                                    <p className="text-sm font-medium text-center">Confirma el código:</p>
                                    <div className="flex justify-center">
                                        <InputOTP
                                            maxLength={6}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                        >
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0} />
                                                <InputOTPSlot index={1} />
                                                <InputOTPSlot index={2} />
                                                <InputOTPSlot index={3} />
                                                <InputOTPSlot index={4} />
                                                <InputOTPSlot index={5} />
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <Button
                                        onClick={handleVerifySetup}
                                        disabled={isPending || code.length !== 6}
                                        className="w-full"
                                    >
                                        {isPending ? <Loader2 className="size-4 animate-spin" /> : "Activar"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {showDisable && (
                    <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300 bg-destructive/5 border border-destructive/20 rounded-lg p-4 gap-4">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-destructive">
                                    Desactivar MFA
                                </p>
                                <p className="text-muted-foreground mt-1">
                                    Esto reducirá la seguridad de tu cuenta. Para continuar, ingresa un código de verificación de tu aplicación de autenticación.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col pt-2 gap-4">
                            <p className="text-sm font-medium text-center">Código de verificación:</p>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={disableCode}
                                    onChange={(value) => setDisableCode(value)}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <Button
                                onClick={handleDisableConfirm}
                                disabled={isPending || disableCode.length !== 6}
                                variant="destructive"
                                className="w-full"
                            >
                                {isPending ? <Loader2 className="size-4 animate-spin" /> : "Desactivar"}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-2">
                {!mfaEnabled && !showSetup && !showDisable && (
                    <Button onClick={handleStartSetup} disabled={isPending} className="w-full">
                        Configurar MFA
                    </Button>
                )}
                {mfaEnabled && !showSetup && !showDisable && (
                    <Button onClick={handleDisableClick} variant="destructive" disabled={isPending} className="w-full">
                        Desactivar MFA
                    </Button>
                )}
                {showDisable && (
                    <Button onClick={() => setShowDisable(false)} variant="ghost" className="w-full">
                        Cancelar
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
