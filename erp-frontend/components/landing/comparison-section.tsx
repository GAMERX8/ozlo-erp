import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { traditionalSteps } from "./data";
import { APP_NAME } from "@/lib/config";

export function ComparisonSection() {
    return (
        <section className="max-w-5xl mx-auto px-4 mb-20 md:mb-28">
            <div className="flex flex-col items-center mb-10">
                <Badge variant="secondary" className="mb-4 bg-muted/50 text-muted-foreground border-none font-normal px-3 py-1 rounded-full text-xs">
                    Comparación
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-center">
                    Método Tradicional vs <span className="text-primary">{APP_NAME}</span>
                </h2>
            </div>

            <Card className="max-w-4xl mx-auto overflow-hidden border-border/40 bg-card rounded-2xl border">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Lado izquierdo: Método Tradicional */}
                    <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-border/40 flex flex-col">
                        <h4 className="text-base font-semibold mb-8 text-muted-foreground">Tradicional</h4>
                        <div className="flex flex-col flex-grow">
                            {traditionalSteps.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-3.5 text-sm border-t border-border/30">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="text-muted-foreground/60">{item.time}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-5 border-t border-border/40 flex justify-between items-center">
                            <span className="font-semibold text-base text-foreground">Total</span>
                            <span className="font-semibold text-lg text-foreground">60 min</span>
                        </div>

                        <p className="mt-6 text-xs italic text-muted-foreground/60 leading-relaxed">
                            Si no eres técnico, multiplica estos tiempos por 10.
                        </p>
                    </div>

                    {/* Lado derecho: SaaS Template */}
                    <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center bg-gradient-to-b from-primary/5 to-transparent">
                        <h4 className="text-base font-semibold mb-10 text-foreground">{APP_NAME}</h4>
                        <div className="flex flex-col items-center mb-8">
                            <span className="text-[100px] md:text-[120px] font-bold tracking-tighter leading-none text-foreground">&lt;1</span>
                            <span className="text-lg md:text-xl text-muted-foreground font-medium mt-1">minuto para desplegar</span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed mx-auto">
                            Elige tu modelo, selecciona un canal y despliega. Nosotros nos encargamos de la infraestructura, llaves y webhooks automáticamente.
                        </p>
                    </div>
                </div>
            </Card>
        </section>
    );
}
