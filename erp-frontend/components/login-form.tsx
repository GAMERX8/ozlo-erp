"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { GoogleSignInButton } from "@/components/google-signin-button"
import { checkUserStatus } from "@/lib/actions"
import { API_URL } from "@/lib/config"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Llamar directamente al backend para manejar el flujo MFA
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Verificar si es usuario OAuth intentando login con password
        if (data.message?.toLowerCase().includes('google') || 
            data.message?.toLowerCase().includes('registrado con')) {
          toast.error("Haz clic en 'Continuar con Google' abajo para iniciar sesión.")
          setLoading(false)
          return
        }

        // Verificar si es por cuenta no verificada
        const statusCheck = await checkUserStatus(email)
        if (statusCheck.success && (statusCheck.data?.status === "unverified" || statusCheck.data?.status === "draft")) {
          toast.info("Cuenta no verificada. Revisa tu correo.")
          return
        }

        toast.error(data.message || "Correo o contraseña incorrectos")
        return
      }

      // Si requiere MFA, guardar token temporal y redirigir
      if (data.mfa_required) {
        localStorage.setItem("mfa_temp_token", data.access_token);
        localStorage.setItem("mfa_temp_user", JSON.stringify(data.user));
        router.push("/mfa/verify")
        return
      }

      // Login normal - usar NextAuth para mantener la sesión
      localStorage.setItem("access_token", data.access_token);
      
      // También iniciar sesión en NextAuth para compatibilidad
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      toast.success("¡Bienvenido de nuevo!")
      router.push("/workspaces")
      router.refresh()
    } catch (err: any) {
      toast.error("Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleLogin}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Inicia sesión 👋</h1>
        <p className="text-muted-foreground text-sm">
          Ingresa tu correo electrónico para acceder
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-sm underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <PasswordInput
            id="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar Sesión"
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              O continúa con
            </span>
          </div>
        </div>

        <GoogleSignInButton />
      </div>

      <div className="text-center text-sm">
        ¿No tienes una cuenta?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Regístrate
        </Link>
      </div>
    </form>
  )
}
