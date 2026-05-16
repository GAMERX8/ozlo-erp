import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";
import { testimonials } from "./data";
import { APP_NAME } from "@/lib/config";

export function TestimonialsSection() {
    return (
        <section className="max-w-6xl mx-auto px-4 mb-20 md:mb-28">
            <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4 bg-muted/50 text-muted-foreground border-none font-normal px-3 py-1 rounded-full text-xs">
                    <Star className="size-3 mr-1.5 fill-current" />
                    Testimonios
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-center mb-2">
                    Amado por builders de todo el mundo
                </h2>
                <p className="text-muted-foreground text-base">Mira lo que la gente dice sobre {APP_NAME}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonials.map((testimonial, i) => (
                    <Card key={i} className="bg-card border-border/50 p-5 hover:border-primary/20 transition-colors shadow-sm">
                        <Quote className="size-5 text-primary/40 mb-3" />
                        <p className="text-foreground/90 text-sm leading-relaxed mb-4">{testimonial.quote}</p>
                        <div className="flex items-center gap-3 mt-auto">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                {testimonial.author[0]}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                                <p className="text-xs text-muted-foreground">{testimonial.handle}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </section>
    );
}
