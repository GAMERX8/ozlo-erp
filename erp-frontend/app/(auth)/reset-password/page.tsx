"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { resetPassword } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

function ResetPasswordContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!token) {
            setError("Token inválido o faltante")
        }
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        if (password.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres")
            return
        }

        setLoading(true)

        try {
            const result = await resetPassword(token!, password)

            if (result.error) {
                toast.error(result.error)
                setError(result.error)
            } else {
                setSuccess(true)
                toast.success("Contraseña restablecida exitosamente")
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            }
        } catch (error) {
            toast.error("Error al restablecer la contraseña")
        } finally {
            setLoading(false)
        }
    }

    if (error && !success) {
        return (
            <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl font-bold">Error</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        {error}
                    </p>
                </div>
                <Link href="/forgot-password">
                    <Button variant="outline" className="w-full gap-2">
                        <ArrowLeft className="size-4" />
                        Solicitar nuevo enlace
                    </Button>
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl font-bold">¡Listo!</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Tu contraseña ha sido restablecida exitosamente. Serás redirigido al inicio de sesión.
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
                <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
                <p className="text-muted-foreground text-sm">
                    Ingresa tu nueva contraseña.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="password">Nueva contraseña</Label>
                    <PasswordInput
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                    <PasswordInput
                        id="confirmPassword"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={loading || !token}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Restableciendo...
                        </>
                    ) : (
                        "Restablecer contraseña"
                    )}
                </Button>

                <div className="text-center text-sm">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/signup" className="underline underline-offset-4">
                        Regístrate gratis
                    </Link>
                </div>
            </form>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl font-bold">Cargando...</h1>
                    <Loader2 className="size-8 animate-spin mx-auto mt-4" />
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    )
}
