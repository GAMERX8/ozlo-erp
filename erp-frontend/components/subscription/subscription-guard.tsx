import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface SubscriptionGuardProps {
    workspaceId: string;
    workspaceSlug: string;
    subscriptionStatus: string | null;
    hasActiveInstances?: boolean;
    hasInstances?: boolean;
    skipOnboarding?: boolean;
    children: React.ReactNode;
}

/**
 * SubscriptionGuard — Server Component
 *
 * Renders children if the user is authenticated.
 * The onboarding content is now shown inline in the dashboard when no instances exist.
 */
export async function SubscriptionGuard({
    children,
}: SubscriptionGuardProps) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    // Always render children - onboarding is shown inline in dashboard
    return <>{children}</>;
}

