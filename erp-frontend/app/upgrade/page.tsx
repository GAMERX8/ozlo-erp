import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getWorkspaces } from "@/lib/workspace-actions";

export default async function UpgradeRedirectPage() {
    const session = await auth();
    
    if (!session?.user) {
        redirect("/login");
    }

    const workspacesResult = await getWorkspaces();
    const workspaces = workspacesResult.data || [];

    // Si no tiene workspaces, redirigir a onboarding
    if (workspaces.length === 0) {
        redirect("/onboarding");
    }

    // Redirigir a la página de upgrade del primer workspace
    // El usuario puede cambiar de workspace desde allí si es necesario
    const workspace = workspaces[0];
    redirect(`/upgrade/${workspace.slug}`);
}
