import type { Metadata } from "next";
import { getAdminActivePlans } from "@/lib/admin-actions";
import { AdminPlansClient } from "@/components/admin/admin-plans-client";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Gestión de Planes - Admin - ${APP_NAME}`,
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        status?: string;
        [key: string]: string | string[] | undefined;
    }>;
}

export default async function AdminPlansPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const status = params.status;

    const result = await getAdminActivePlans({ page, limit: 20, status });

    // El backend devuelve { plans[], total, page, limit }
    const plans = result.success ? result.data?.plans || [] : [];
    const total = result.success ? result.data?.total || 0 : 0;
    const limit = result.success ? result.data?.limit || 20 : 20;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const initialData = {
        data: plans,
        meta: {
            total,
            page,
            limit: 20,
            totalPages,
        },
    };

    return (
        <AdminPlansClient
            initialData={initialData}
            currentPage={page}
            statusFilter={status}
        />
    );
}
