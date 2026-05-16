import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    // El layout solo verifica autenticación.
    // La estructura (header, sidebar) se maneja en cada page según el contexto.
    return <>{children}</>;
}
