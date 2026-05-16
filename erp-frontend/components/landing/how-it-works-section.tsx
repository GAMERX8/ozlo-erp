import { Card } from "@/components/ui/card";
import { howItWorksSteps } from "./data";

export function HowItWorksSection() {
    return (
        <section className="max-w-6xl mx-auto px-4 mb-20 md:mb-28">
            <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
                    Cómo funciona
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {howItWorksSteps.map((step, i) => (
                    <Card key={i} className="bg-card/40 backdrop-blur-sm border-border/50 p-8 rounded-2xl flex flex-col items-start text-left hover:border-primary/30 transition-colors group">
                        <div className="size-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            {step.number}
                        </div>
                        <h3 className="text-xl font-bold mb-3 leading-tight text-foreground">
                            {step.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {step.description}
                        </p>
                    </Card>
                ))}
            </div>
        </section>
    );
}
