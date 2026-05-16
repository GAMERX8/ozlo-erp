import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getWorkspaceBySlug, getWorkspaces } from "@/lib/workspace-actions";

import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarProviderWrapper } from "@/components/dashboard/sidebar-provider-wrapper";
import { ChatRail } from "@/components/dashboard/chat-rail";
import { PendingCancellationBanner } from "@/components/billing/pending-cancellation-banner";
import { PaymentFailedBanner } from "@/components/billing/payment-failed-banner";
import { CanceledBanner } from "@/components/billing/canceled-banner";

interface LayoutProps {
    children: React.ReactNode;
    params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceLayout({ children, params }: LayoutProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { workspaceId } = await params;

    // Buscar workspace por slug
    const workspaceResult = await getWorkspaceBySlug(workspaceId);

    if (workspaceResult.error || !workspaceResult.data) {
        notFound();
    }

    const workspace = workspaceResult.data;
    const allWorkspacesResult = await getWorkspaces();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SidebarProvider>
                <SidebarProviderWrapper>
                    <Sidebar
                        workspaces={allWorkspacesResult.data || []}
                        currentWorkspaceId={workspace.slug}
                        currentPlan={workspace.plan}
                        user={{
                            name: session.user.first_name || "Usuario",
                            email: session.user.email || "",
                            avatar: session.user.image || "",
                            role: session.user.role,
                        }}
                    />
                    <ChatRail workspaceId={workspace.id} accessToken={session.access_token} />
                    <SidebarInset className="md:peer-data-[state=collapsed]:[&_[data-content-wrapper]]:max-w-[88rem]">
                        <DashboardHeader
                            user={{
                                name: session.user.first_name || "Usuario",
                                email: session.user.email || "",
                                image: session.user.image,
                                role: session.user.role,
                            }}
                            workspaces={allWorkspacesResult.data || []}
                            currentWorkspaceId={workspace.slug}
                            workspaceId={workspace.id}
                            currentPlan={workspace.plan}
                        />
                        <div className="flex flex-1 flex-col pt-16 md:pt-0 h-full">
                            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-muted/10 transition-[padding-right] duration-200 md:pr-[var(--chat-rail-offset,0px)]">
                                <div data-content-wrapper className="w-full max-w-7xl mx-auto p-6 md:p-8 transition-[max-width] duration-200 overflow-hidden">
                                    {/* Banners de estado de facturación */}
                                    <PaymentFailedBanner workspaceId={workspace.id} />
                                    <PendingCancellationBanner workspaceId={workspace.id} />
                                    <CanceledBanner workspaceId={workspace.id} />
                                    {children}
                                </div>
                            </main>
                        </div>
                    </SidebarInset>
                </SidebarProviderWrapper>
            </SidebarProvider>

        </div>
    );
}
