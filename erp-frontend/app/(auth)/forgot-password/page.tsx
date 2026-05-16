"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await requestPasswordReset(email)

            if (result.error) {
                toast.error(result.error)
            } else {
                setSent(true)
                toast.success("Correo enviado. Revisa tu bandeja de entrada.")
            }
        } catch (error) {
            toast.error("Error al enviar el correo")
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col gap-6 text-center">
                <div className="flex flex-col items-center gap-1">
                    <h1 className="text-2xl font-bold">Correo enviado</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Si existe una cuenta con {email}, recibirás un enlace para restablecer tu contraseña.
                    </p>
                </div>
                <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                        <ArrowLeft className="size-4" />
                        Volver al inicio de sesión
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
                <p className="text-muted-foreground text-sm">
                    Introduce tu correo electrónico
                </p>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4">
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

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar enlace"
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
