import { auth } from "@/auth";
import {
    HeroSection,
    TrustSection,
    HowItWorksSection,
    ComparisonSection,
    TestimonialsSection,
    UseCasesSection,
    FinalCTASection,
    LandingNavbar,
    LandingFooter,
} from "@/components/landing";

export default async function Home() {
    const session = await auth();

    return (
        <div className="min-h-screen bg-background selection:bg-primary/10 overflow-x-hidden">
            <LandingNavbar user={session?.user} />

            <main className="pt-20 sm:pt-24 pb-0">
                <HeroSection />
                <TrustSection />
                <HowItWorksSection />
                <ComparisonSection />
                <TestimonialsSection />
                <UseCasesSection />
                <FinalCTASection />
            </main>

            <LandingFooter />
        </div>
    );
}
