import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
    return (
        <section className="relative max-w-5xl mx-auto px-4 text-center mb-6 sm:mb-8 md:mb-10">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/5 via-transparent to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.1] pt-8 sm:pt-12">
                Tu Plataforma <span className="text-primary">ERP</span>
                <br />
                <span className="text-foreground">Lista para</span>{" "}
                <span className="text-primary">Escalar</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
                La base perfecta para tu próximo SaaS. Multitenancy, Roles, Auditoría y Facturación integrados.
                Sin configuraciones complejas, empieza a construir lo que importa hoy mismo.
            </p>

            {/* Capability Bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4 text-[10px] sm:text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
                <div className="flex items-center gap-3">
                    <span>Impulsado por Tecnología de Punta</span>
                </div>

                <div className="hidden sm:block w-px h-4 bg-border/40 mx-2" />

                <div className="flex items-center gap-3">
                    <span>SaaS Ready</span>
                </div>
                
                <div className="hidden sm:block w-px h-4 bg-border/40 mx-2" />
                
                <div className="flex items-center gap-3">
                    <span>Multi-Tenant</span>
                </div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold h-14" asChild>
                    <Link href="/signup">
                        Empieza ahora
                        <ArrowRight className="size-5 ml-2" />
                    </Link>
                </Button>
            </div>
            <p className="mt-4 text-xs text-center text-balance text-muted-foreground">
                SaaS Template diseñado para el futuro.
            </p>
        </section>
    );
}
