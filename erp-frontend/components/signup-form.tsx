"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import { Loader2, Check, X, Mail } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { GoogleSignInButton } from "@/components/google-signin-button"
import { PhoneInput } from "@/components/ui/phone-input"
import { registerUser } from "@/lib/actions"

interface PasswordValidation {
  label: string
  test: (password: string) => boolean
}

const passwordValidations: PasswordValidation[] = [
  { label: "Una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /[0-9]/.test(p) },
  { label: "Un carácter especial (!?<>@#$%)", test: (p) => /[!?<>@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  { label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
]

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Register User
      const result = await registerUser({
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        phone: phone || undefined,
      }) as any

      if (result.error) {
        // Detectar si el error es de usuario OAuth existente
        if (result.error.toLowerCase().includes('google') || 
            result.error.toLowerCase().includes('registrado con')) {
          toast.error("Haz clic en 'Continuar con Google' abajo para iniciar sesión.")
        } else {
          toast.error(result.error)
        }
        setLoading(false)
        return
      }

      toast.success("Cuenta creada exitosamente")
      setIsRegistered(true)

      // El workspace se crea automáticamente en el backend
      // No hay login automático, el usuario debe verificar email e iniciar sesión manualmente

    } catch (err: any) {
      console.error("Register flow error:", err)
      toast.error("Ocurrió un error inesperado")
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Completa el formulario para registrarte
        </p>
      </div>

      {isRegistered ? (
        <div className="rounded-xl border border-border bg-card/40 p-5 flex items-start gap-4 text-left shadow-sm backdrop-blur-sm mt-2 animate-in fade-in slide-in-from-top-4 duration-700 ease-out fill-mode-forwards">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="size-4 stroke-[3px]" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              ¡Registro exitoso!
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Te has registrado correctamente. Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.
            </p>
          </div>
        </div>
      ) : (
        <form className="grid gap-4 animate-in fade-in duration-500" onSubmit={handleRegister}>
          {/* Nombre y Apellido en 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">Nombre</Label>
              <Input
                id="first-name"
                type="text"
                placeholder="Juan"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Apellido</Label>
              <Input
                id="last-name"
                type="text"
                placeholder="Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <PhoneInput
              id="phone"
              placeholder="+34 612 345 678"
              value={phone}
              onChange={(value) => setPhone(value || "")}
              defaultCountry="ES"
            />
          </div>

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
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              required
              placeholder="••••••••"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* Checklist de validaciones de contraseña - solo aparece cuando se escribe */}
            {password.length > 0 && (
              <div className="space-y-1.5 mt-1">
                {passwordValidations.map((validation, index) => {
                  const isValid = validation.test(password)
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors duration-200",
                        isValid ? "text-green-600" : "text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full border transition-all duration-200",
                          isValid
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isValid ? (
                          <Check className="size-2.5" strokeWidth={3} />
                        ) : (
                          <X className="size-2.5 opacity-0" strokeWidth={3} />
                        )}
                      </div>
                      <span>{validation.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O regístrate con
              </span>
            </div>
          </div>

          <GoogleSignInButton />
        </form>
      )}

      <div className="text-center text-sm">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Inicia sesión
        </Link>
      </div>
    </div>
  )
}
