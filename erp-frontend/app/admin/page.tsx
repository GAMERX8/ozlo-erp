import { getAdminDashboardStats } from "@/lib/admin-actions";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { logger } from "@/lib/logger";

import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Admin Dashboard | ${APP_NAME}`,
    description: "Panel de administración",
};

// Esta página usa headers para autenticación, debe ser dinámica
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    let stats;
    try {
        const result = await getAdminDashboardStats();
        if (result.success) {
            stats = result.data;
        }
    } catch (error) {
        logger.error("Error loading dashboard stats:", error);
        // Si hay error, no pasar initialStats para que el cliente cargue los datos
        stats = undefined;
    }

    return <AdminDashboardClient initialStats={stats} />;
}
