import Image from "next/image";

// Static logo imports
import googleLogo from "@/public/trust/google.svg";
import metaLogo from "@/public/trust/meta.svg";
import openaiLogo from "@/public/trust/openai.svg";
import anthropicLogo from "@/public/trust/anthropic.svg";
import stripeLogo from "@/public/trust/stripe.svg";
import vercelLogo from "@/public/trust/vercel.svg";

const logos = [
    { src: googleLogo, alt: "Google" },
    { src: metaLogo, alt: "Meta" },
    { src: openaiLogo, alt: "OpenAI" },
    { src: anthropicLogo, alt: "Anthropic" },
    { src: stripeLogo, alt: "Stripe" },
    { src: vercelLogo, alt: "Vercel" },
];

export function TrustSection() {
    return (
        <section className="w-full border-y border-border/30 py-10 mb-20 md:mb-28 bg-muted/5">
            <div className="max-w-5xl mx-auto px-4">
                <p className="text-center text-[10px] sm:text-xs font-medium tracking-[0.2em] text-muted-foreground/50 uppercase mb-10">
                    TRUSTED BY TEAMS AT
                </p>
                <div className="grid grid-cols-3 sm:flex sm:flex-nowrap justify-items-center sm:justify-center items-center gap-y-8 gap-x-4 sm:gap-x-8 md:gap-x-12 lg:gap-x-20 opacity-40 grayscale contrast-125 brightness-0 dark:invert px-4">
                    {logos.map((logo) => (
                        <Image 
                            key={logo.alt}
                            src={logo.src} 
                            alt={logo.alt} 
                            className="h-4 sm:h-4 md:h-5 lg:h-6 w-auto flex-shrink-0" 
                            width={120}
                            height={24}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
