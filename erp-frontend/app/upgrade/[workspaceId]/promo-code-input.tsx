"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyPromoCode } from "@/lib/stripe-actions";
import { toast } from "sonner";
import { Tag, CheckCircle, Loader2, X } from "lucide-react";

interface PromoCodeInputProps {
    workspaceId: string;
    onPromoCodeApplied?: (code: string | null) => void;
}

export function PromoCodeInput({ workspaceId, onPromoCodeApplied }: PromoCodeInputProps) {
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [discount, setDiscount] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleApply = async () => {
        if (!code.trim()) {
            toast.error("Ingresa un código promocional");
            return;
        }

        setIsLoading(true);
        const result = await applyPromoCode(workspaceId, code.trim());

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("¡Código aplicado exitosamente!");
            const trimmedCode = code.trim();
            setAppliedCode(trimmedCode);
            // Guardar en localStorage para que PlanSelectorWrapper lo lea
            localStorage.setItem('promoCode', trimmedCode);
            onPromoCodeApplied?.(trimmedCode);
            if (result.discount) {
                setDiscount(result.discount);
            }
            setCode("");
        }
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleApply();
        }
    };

    const handleClear = () => {
        setAppliedCode(null);
        setDiscount(null);
        setCode("");
        localStorage.removeItem('promoCode');
        onPromoCodeApplied?.(null);
    };

    // Si ya hay un código aplicado, mostrar el banner de éxito
    if (appliedCode) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
                <div className="flex-grow">
                    <p className="text-sm font-medium text-green-900">
                        Código aplicado: <span className="font-bold">{appliedCode}</span>
                    </p>
                    {discount && (
                        <p className="text-xs text-green-700 mt-0.5">
                            {discount}
                        </p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-green-700 hover:text-green-800 hover:bg-green-100"
                >
                    Cambiar
                </Button>
            </div>
        );
    }

    // Si no está abierto, mostrar texto con "Aplicar" clickeable
    if (!isOpen) {
        return (
            <div className="text-sm text-muted-foreground">
                ¿Tienes un código promocional?{" "}
                <button
                    onClick={() => setIsOpen(true)}
                    className="underline hover:text-foreground transition-colors"
                >
                    Aplicar
                </button>
            </div>
        );
    }

    // Si está abierto, mostrar el input
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Código promocional</span>
                <button
                    onClick={() => {
                        setIsOpen(false);
                        setCode("");
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="size-4" />
                </button>
            </div>

            <div className="flex gap-2">
                <div className="flex-grow">
                    <Input
                        placeholder="Ingresa tu código (ej: DESCUENTO20)"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="uppercase"
                        autoFocus
                    />
                </div>
                <Button
                    onClick={handleApply}
                    disabled={isLoading || !code.trim()}
                    variant="secondary"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Aplicando...
                        </>
                    ) : (
                        "Aplicar"
                    )}
                </Button>
            </div>
        </div>
    );
}
