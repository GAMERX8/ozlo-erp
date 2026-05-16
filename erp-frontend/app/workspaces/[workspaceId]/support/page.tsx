import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { MessageCircle } from "lucide-react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SupportPageProps {
    params: Promise<{ workspaceId: string }>;
}

export default async function SupportPage({ params }: SupportPageProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (!workspaceResult.data) redirect("/workspaces");
    
    const workspace = workspaceResult.data;

    const whatsappNumber = "51920789569";
    const whatsappMessage = encodeURIComponent(
        `Hola, soy ${session.user.first_name || "usuario"} del workspace "${workspace.name}". Necesito ayuda con…`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            {/* Header - Consistent with Billing & Members */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Soporte
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        ¿Necesitas ayuda? Contáctanos directamente por WhatsApp.
                    </p>
                </div>
            </div>

            {/* WhatsApp Contact Card */}
            <Card className="overflow-hidden border-2">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                <MessageCircle className="size-6 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">WhatsApp</h3>
                                <p className="text-sm text-muted-foreground">
                                    Chatea con nuestro equipo de soporte en tiempo real.
                                </p>
                            </div>
                        </div>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button>
                                <MessageCircle />
                                Contactar por WhatsApp
                            </Button>
                        </a>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
