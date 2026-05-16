"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/config";

export default function MfaVerifyPage() {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Verificar que hay un token temporal
  useEffect(() => {
    const tempToken = localStorage.getItem("mfa_temp_token");
    if (!tempToken) {
      router.push("/login");
    }
  }, [router]);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError("Ingresa un código válido");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const tempToken = localStorage.getItem("mfa_temp_token");

      if (!tempToken) {
        setError("Sesión expirada. Por favor inicia sesión nuevamente.");
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/auth/mfa/verify-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Código inválido");
        return;
      }

      // Limpiar token temporal
      localStorage.removeItem("mfa_temp_token");
      localStorage.removeItem("mfa_temp_user");

      // Guardar token completo
      localStorage.setItem("access_token", data.access_token);

      // También actualizar sesión de NextAuth para compatibilidad con middleware
      await signIn("credentials", {
        email: data.user.email,
        token: data.access_token,
        redirect: false,
      });

      toast.success("¡Verificación exitosa! Bienvenido.");
      router.push("/workspaces");
      router.refresh();
    } catch (err: any) {
      setError("Error al verificar el código. Intenta nuevamente.");
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleVerify();
      }}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Verificación 2FA</h1>
        <p className="text-muted-foreground text-sm">
          Ingresa el código de 6 dígitos de tu aplicación de autenticación.
        </p>
      </div>

      <div className="grid gap-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col pt-2 gap-4">
          <div className="flex justify-start">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              onKeyDown={handleKeyDown}
              autoFocus
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
        </div>

        <Button
          type="submit"
          disabled={verifying || code.length !== 6}
          className="w-full"
        >
          {verifying ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </Button>
      </div>

      <div className="text-center text-sm mt-4">
        ¿Problemas para acceder?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Iniciar sesión
        </Link>
      </div>
    </form>
  );
}
