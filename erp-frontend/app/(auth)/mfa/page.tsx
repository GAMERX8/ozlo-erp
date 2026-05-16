"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { apiClient } from "@/lib/api-client";
import { Loader2, Shield, Copy, CheckCircle2, AlertCircle } from "lucide-react";

interface MfaSetupData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export default function MfaSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"qr" | "backup" | "success">("qr");

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    try {
      const response = await apiClient.post("/mfa/setup");
      setSetupData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al cargar configuración MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Ingresa un código de 6 dígitos");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      await apiClient.post("/mfa/verify", { code: verificationCode });
      setStep("backup");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Código inválido");
    } finally {
      setVerifying(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const appName = process.env.NEXT_PUBLIC_APP_NAME || "SaaS Template";
    const content = `Códigos de respaldo - ${appName}
Guárdalos en un lugar seguro. Cada código solo se puede usar una vez.

${setupData.backupCodes.join("\n")}

Generado: ${new Date().toLocaleString()}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (step === "backup" && setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-green-500" />
              ¡MFA Activado!
            </CardTitle>
            <CardDescription>
              Guarda estos códigos de respaldo en un lugar seguro. Los necesitarás si pierdes acceso a tu autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 rounded-md flex items-start gap-2">
              <AlertCircle className="size-4 text-yellow-500 mt-0.5" />
              <p className="text-yellow-700 text-sm">
                <strong>Importante:</strong> Estos códigos solo se muestran una vez.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setupData.backupCodes.map((code, i) => (
                  <div key={i} className="bg-background p-2 rounded border text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={downloadBackupCodes} variant="outline" className="w-full">
              Descargar códigos
            </Button>

            <Button onClick={() => router.push("/workspaces")} className="w-full">
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Configurar Autenticación de Dos Factores
          </CardTitle>
          <CardDescription>
            Escanea el código QR con Google Authenticator o similar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {setupData && (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={setupData.qrCode}
                    alt="QR Code MFA"
                    className="size-48"
                  />
                </div>

                <div className="w-full">
                  <p className="text-sm text-muted-foreground mb-2">
                    Si no puedes escanear el QR, ingresa este código manualmente:
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
                      {setupData.secret}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copySecret}
                    >
                      {copied ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">
                  Ingresa el código de 6 dígitos de tu app:
                </label>
                <div className="flex gap-2">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={(value) => setVerificationCode(value)}
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
                  <Button
                    onClick={handleVerify}
                    disabled={verifying || verificationCode.length !== 6}
                  >
                    {verifying ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Verificar"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
