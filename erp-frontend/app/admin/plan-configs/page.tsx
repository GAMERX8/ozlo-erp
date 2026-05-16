import type { Metadata } from "next";
import { getAdminPlans } from "@/lib/admin-actions";
import { AdminPlanConfigsClient } from "@/components/admin/admin-plan-configs-client";
import { APP_NAME } from "@/lib/config";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: `Planes Base - Admin - ${APP_NAME}`,
};

export default async function AdminPlanConfigsPage() {
    const plansResult = await getAdminPlans();
    const plans = plansResult.success && plansResult.data ? plansResult.data : [];

    return (
        <AdminPlanConfigsClient initialPlans={plans} />
    );
}
