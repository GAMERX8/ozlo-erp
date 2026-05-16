"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCreditCheckoutSession } from "@/lib/stripe-actions";
import { cn } from "@/lib/utils";

interface CreditRechargeModalProps {
    workspaceId: string;
    workspaceSlug: string;
    children?: React.ReactNode;
}

const CREDIT_PACKS = [5, 10, 25, 50, 100];

const MIN_AMOUNT = 5;
const MAX_AMOUNT = 9999;
const MULTIPLE_OF = 5;

export function CreditRechargeModal({ workspaceId, workspaceSlug, children }: CreditRechargeModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPack, setSelectedPack] = useState<number | null>(5);
    const [customAmount, setCustomAmount] = useState<string>("5");
    const [isCustomLoading, setIsCustomLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const validateAmount = (amount: number): string | null => {
        if (isNaN(amount)) return "Ingresa un número válido";
        if (amount < MIN_AMOUNT) return `El monto mínimo es ${MIN_AMOUNT} USD`;
        if (amount > MAX_AMOUNT) return `El monto máximo es ${MAX_AMOUNT} USD`;
        if (amount % MULTIPLE_OF !== 0) return `Debe ser múltiplo de ${MULTIPLE_OF} USD`;
        return null;
    };

    const handlePackSelect = (amount: number) => {
        setSelectedPack(amount);
        setCustomAmount(amount.toString());
        setError(null);
    };

    const handleCustomRecharge = async () => {
        const amount = parseInt(customAmount, 10);
        const validationError = validateAmount(amount);
        
        if (validationError) {
            setError(validationError);
            return;
        }

        setError(null);
        setIsCustomLoading(true);
        try {
            const result = await createCreditCheckoutSession(workspaceId, amount);
            if (result.error) {
                toast.error(result.error);
            } else if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            }
        } catch (error) {
            toast.error("Error al procesar la recarga");
        } finally {
            setIsCustomLoading(false);
        }
    };

    const handleCustomInputChange = (value: string) => {
        // Solo permitir números
        const numericValue = value.replace(/[^0-9]/g, "");
        setCustomAmount(numericValue);
        setError(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline">
                        Comprar más
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        Comprar uso adicional
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Selecciona un paquete o ingresa una cantidad personalizada.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col py-4 gap-6">
                    {/* Paquetes predefinidos */}
                    <div className="grid grid-cols-5 gap-2">
                        {CREDIT_PACKS.map((pack) => (
                            <button
                                key={pack}
                                onClick={() => handlePackSelect(pack)}
                                disabled={isCustomLoading}
                                className={cn(
                                    "relative flex items-center justify-center py-2 px-1 border-2 rounded-md transition-all duration-200",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                    "border-border bg-card",
                                    selectedPack === pack && "border-primary ring-1 ring-primary"
                                )}
                            >
                                <span className={cn(
                                    "text-sm",
                                    selectedPack === pack && "text-primary"
                                )}>{pack} USD</span>
                            </button>
                        ))}
                    </div>

                    {/* Cantidad personalizada */}
                    <div className="flex flex-col gap-3">
                        <Input
                            id="custom-amount"
                            type="text"
                            inputMode="numeric"
                            placeholder={`${MIN_AMOUNT} - ${MAX_AMOUNT} USD`}
                            value={customAmount}
                            onChange={(e) => handleCustomInputChange(e.target.value)}
                            className={cn(
                                "text-lg",
                                error && "border-destructive focus-visible:ring-destructive"
                            )}
                        />
                        {customAmount && !error && parseInt(customAmount) >= MIN_AMOUNT && (
                            <div className="flex flex-col py-2 gap-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Uso adicional</span>
                                    <span>USD {parseInt(customAmount).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-base font-medium pt-2 border-t">
                                    <span>Total a pagar</span>
                                    <span>USD {parseInt(customAmount).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        <Button
                            onClick={handleCustomRecharge}
                            disabled={!customAmount || isCustomLoading}
                            className="w-full"
                        >
                            {isCustomLoading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                "Comprar"
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Al hacer clic en Comprar, autorizas a Ozlo a cobrar a tu tarjeta el monto indicado arriba.
                        </p>
                        {error && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                                <span className="inline-block size-1 rounded-full bg-destructive" />
                                {error}
                            </p>
                        )}

                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
