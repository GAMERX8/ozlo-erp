import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import Link from "next/link";

interface Props {
    params: Promise<{ workspaceId: string }>;
}

export default async function BillingCancelPage({ params }: Props) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col text-center max-w-sm mx-auto px-4 gap-6">
                <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
                    <XCircle className="size-8 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">Pago cancelado</h1>
                    <p className="text-muted-foreground">
                        No se realizó ningún cargo. Puedes activar tu workspace cuando
                        estés listo.
                    </p>
                </div>
                <Link
                    href={`/workspaces/${workspaceId}`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Volver al Workspace
                </Link>
            </div>
        </div>
    );
}
