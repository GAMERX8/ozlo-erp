import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { WorkspaceBillingStatus } from "@/components/billing/workspace-billing-status";

interface BillingPageProps {
    params: Promise<{ workspaceId: string }>;
    searchParams: Promise<{ plan?: string }>;
}

export async function generateMetadata({ params }: BillingPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const result = await getWorkspaceBySlug(workspaceId);
    return {
        title: result.data ? `Facturación - ${result.data.name}` : "Facturación",
    };
}

export default async function BillingPage({ params, searchParams }: BillingPageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const { workspaceId } = await params;
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (workspaceResult.error || !workspaceResult.data) {
        notFound();
    }

    const workspace = workspaceResult.data;

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gestiona tu plan y métodos de pago de <span className="font-medium">{workspace.name}</span>
                    </p>
                </div>
            </div>

            {/* Billing Status */}
            <WorkspaceBillingStatus
                workspaceId={workspace.id}
                workspaceSlug={workspaceId}
            />
        </div>
    );
}
