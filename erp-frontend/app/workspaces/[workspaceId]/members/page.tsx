import type { Metadata } from "next";
import { getWorkspaceBySlug } from "@/lib/workspace-actions";
import { getWorkspacePendingInvitations } from "@/lib/invitation-actions";
import { WorkspaceMembers } from "@/components/dashboard/workspace-members";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";

interface MembersPageProps {
    params: Promise<{ workspaceId: string }>;
}

export async function generateMetadata({ params }: MembersPageProps): Promise<Metadata> {
    const { workspaceId } = await params;
    const result = await getWorkspaceBySlug(workspaceId);
    return {
        title: result.data ? `Miembros - ${result.data.name}` : "Miembros",
    };
}

export default async function MembersPage({ params }: MembersPageProps) {
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
    const invitationsResult = await getWorkspacePendingInvitations(workspace.id);

    return (
        <WorkspaceMembers
            workspace={workspace}
            pendingInvitations={invitationsResult.data || []}
            currentUserId={session.user.id}
            currentUserEmail={session.user.email || ""}
        />
    );
}
