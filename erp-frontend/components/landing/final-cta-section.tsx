import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTASection() {
    return (
        <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                Comienza a desplegar ahora
            </h2>
            <p className="text-muted-foreground text-base mb-6 max-w-lg mx-auto">
                Elige un modelo, selecciona un canal y ten tu asistente de IA funcionando en menos de un minuto.
            </p>
            <div className="flex flex-col items-center gap-3">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                    <Link href="/signup">
                        Empezar ahora
                        <ArrowRight className="size-4 ml-2" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                    Configuración en menos de un minuto. Cancela cuando quieras.
                </p>
            </div>
        </section>
    );
}
