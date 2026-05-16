"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { verifyEmail, resendVerificationEmail } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(!!token)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")
    const [resending, setResending] = useState(false)

    useEffect(() => {
        if (token) {
            verifyToken()
        }
    }, [token])

    const verifyToken = async () => {
        setVerifying(true)
        try {
            const result = await verifyEmail(token!)

            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                toast.success("Email verificado exitosamente")
            }
        } catch (error) {
            setError("Error al verificar el email")
        } finally {
            setVerifying(false)
        }
    }

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            toast.error("Ingresa tu correo electrónico")
            return
        }

        setResending(true)
        try {
            const result = await resendVerificationEmail(email)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Email de verificación reenviado")
            }
        } catch (error) {
            toast.error("Error al reenviar el email")
        } finally {
            setResending(false)
        }
    }

    if (verifying) {
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <h1 className="text-2xl font-bold">Verificando email...</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Por favor espera mientras verificamos tu correo.
                </p>
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl font-bold">¡Email verificado!</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Tu correo ha sido verificado exitosamente. Ahora puedes iniciar sesión.
                    </p>
                </div>
                <Link href="/login">
                    <Button className="w-full">
                        Ir al inicio de sesión
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">{error ? "Error de verificación" : "Verificar email"}</h1>
                <p className="text-muted-foreground text-sm">
                    {error
                        ? "El enlace ha expirado o es inválido. Puedes solicitar un nuevo email de verificación."
                        : "Ingresa tu correo para recibir un nuevo enlace de verificación."
                    }
                </p>
            </div>
            <form onSubmit={handleResend} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <Button type="submit" className="w-full" disabled={resending}>
                    {resending ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Reenviar email de verificación"
                    )}
                </Button>

                <div className="text-center text-sm">
                    <Link href="/login" className="underline underline-offset-4">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </form>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <h1 className="text-2xl font-bold">Cargando...</h1>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    )
}
