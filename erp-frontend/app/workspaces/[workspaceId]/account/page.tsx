import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { APP_NAME } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AccountPage");

export const metadata: Metadata = {
    title: `Mi Cuenta | ${APP_NAME}`,
    description: "Gestiona tu perfil y configuración",
};
import { getCurrentUser } from "@/lib/profile-actions";
import { getUserWorkspaces } from "@/lib/actions";
import { getPendingInvitations } from "@/lib/invitation-actions";
import { ProfileClient } from "@/components/account/profile-client";

export default async function AccountPage() {
    logger.log("Starting...");
    const session = await auth();
    
    if (!session?.user) {
        logger.log("No session, redirecting to /login");
        redirect("/login");
    }

    logger.log("User:", session.user.email);
    
    const [userResult, workspacesResult, invitationsResult] = await Promise.all([
        getCurrentUser(),
        getUserWorkspaces(),
        getPendingInvitations(),
    ]);
    
    logger.log("Profile error:", userResult.error, "Has profile:", !!userResult.data);

    // Get provider from session
    const provider = session.user.provider || "credentials";

    // Extract data or use defaults
    const profile = userResult.data;
    const workspaces = workspacesResult.data || [];
    const invitations = invitationsResult.data || [];

    // If API fails, use session data as fallback instead of redirecting
    if (userResult.error || !profile) {
        logger.log("Using session data as fallback");
        const fallbackProfile = {
            id: session.user.id,
            email: session.user.email || "",
            first_name: session.user.first_name || null,
            last_name: session.user.last_name || null,
            mfa_enabled: false,
        };
        
        return (
            <div className="flex flex-col animate-in fade-in duration-500 gap-6">
                <ProfileClient 
                    profile={fallbackProfile} 
                    workspaces={workspaces} 
                    invitations={invitations} 
                    provider={provider}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col animate-in fade-in duration-500 gap-6">
            <ProfileClient 
                profile={profile} 
                workspaces={workspaces} 
                invitations={invitations} 
                provider={provider}
            />
        </div>
    );
}
