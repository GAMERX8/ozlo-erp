import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeContent } from "./upgrade-content";
import { PromoCodeWrapper } from "./promo-code-wrapper";

export const metadata = {
    title: "Upgrade - Ozlo",
};

interface UpgradePageProps {
    params: Promise<{
        workspaceId: string;
    }>;
}

export default async function UpgradePage({ params }: UpgradePageProps) {
    const session = await auth();
    const { workspaceId } = await params;
    
    if (!session?.user) {
        redirect("/login");
    }

    const workspaceResult = await getWorkspaceBySlug(workspaceId);
    
    if (!workspaceResult.success || !workspaceResult.data) {
        redirect("/workspaces");
    }

    const workspace = workspaceResult.data;

    return (
        <div className="min-h-screen bg-background">
            {/* Header con logo */}
            <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
                <Button variant="ghost" size="icon" asChild className="shrink-0">
                    <Link href={`/workspaces/${workspace.slug}`}>
                        <ArrowLeft className="size-5" />
                    </Link>
                </Button>
                <Link href={`/workspaces/${workspace.slug}`} className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                    <Logo height={40} />
                </Link>
                <div className="w-10 shrink-0" /> {/* Spacer para centrar */}
            </header>

            {/* Contenido principal */}
            <main className="pt-24 pb-12 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold tracking-tight mb-3">
                            Elige tu plan
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Selecciona el plan que mejor se adapte a tus necesidades.
                        </p>
                    </div>

                    <Suspense fallback={
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
                        </div>
                    }>
                        <UpgradeContent 
                            workspaceId={workspace.id}
                            workspaceSlug={workspace.slug}
                        />
                    </Suspense>

                    {/* Promo Code Section - Ahora entre planes y footer */}
                    <div className="mt-12 text-center">
                        <PromoCodeWrapper workspaceId={workspace.id} />
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-muted-foreground">
                        <p>
                            ¿Tienes preguntas?{" "}
                            <Link href={`/workspaces/${workspace.slug}/support`} className="underline hover:text-foreground">
                                Contacta a soporte
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
