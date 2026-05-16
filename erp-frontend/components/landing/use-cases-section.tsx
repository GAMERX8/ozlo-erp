import { Badge } from "@/components/ui/badge";
import { useCases } from "./data";
import { APP_NAME } from "@/lib/config";

export function UseCasesSection() {
    const firstRow = useCases.slice(0, 8);
    const secondRow = useCases.slice(8, 16);
    const thirdRow = useCases.slice(16);

    return (
        <section className="py-12 md:py-16 bg-muted/20 relative overflow-hidden mb-0 border-y border-border/50">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-primary/5 via-transparent to-transparent blur-[120px] -z-10" />

            <div className="container mx-auto px-4 text-center mb-8 md:mb-10 relative z-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-2">
                    Todo lo que necesitas para gestionar tu <span className="text-primary">{APP_NAME}</span>
                </h2>
                <p className="text-sm text-muted-foreground">Una plataforma moderna para negocios modernos</p>
            </div>

            <div className="max-w-6xl mx-auto px-4 overflow-hidden">
                <div className="flex flex-col gap-3 mask-fade-edges">
                    {/* Row 1 */}
                    <div className="flex whitespace-nowrap gap-3 animate-marquee">
                        {[...firstRow, ...firstRow].map((text, i) => (
                            <Badge key={i} variant="outline" className="px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border-border/50 text-sm font-normal hover:border-primary/30 transition-colors cursor-default">
                                {text}
                            </Badge>
                        ))}
                    </div>

                    {/* Row 2 */}
                    <div className="flex whitespace-nowrap gap-3 animate-marquee-reverse">
                        {[...secondRow, ...secondRow].map((text, i) => (
                            <Badge key={i} variant="outline" className="px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border-border/50 text-sm font-normal hover:border-primary/30 transition-colors cursor-default">
                                {text}
                            </Badge>
                        ))}
                    </div>

                    {/* Row 3 */}
                    <div className="flex whitespace-nowrap gap-3 animate-marquee">
                        {[...thirdRow, ...thirdRow].map((text, i) => (
                            <Badge key={i} variant="outline" className="px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border-border/50 text-sm font-normal hover:border-primary/30 transition-colors cursor-default">
                                {text}
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-10 text-center relative z-10 px-4">
                <p className="text-xs italic text-muted-foreground/70">
                    Tu sistema corporativo, tus reglas.
                </p>
            </div>
        </section>
    );
}
