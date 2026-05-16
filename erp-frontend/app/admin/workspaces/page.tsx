import type { Metadata } from "next";
import { getAdminWorkspaces } from "@/lib/admin-actions";
import { AdminWorkspacesClient } from "@/components/admin/admin-workspaces-client";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Gestión de Workspaces - Admin - ${APP_NAME}`,
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        search?: string;
    }>;
}

export default async function AdminWorkspacesPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const search = params.search;

    const result = await getAdminWorkspaces({ page, limit: 20, search });

    // El backend devuelve { data: workspaces[], meta: {...} }
    const workspaces = result.success ? result.data?.data || [] : [];
    const total = result.success ? result.data?.meta?.total || 0 : 0;
    const totalPages = result.success ? result.data?.meta?.totalPages || 1 : 1;

    const initialData = {
        data: workspaces,
        meta: {
            total,
            page,
            limit: 20,
            totalPages,
        },
    };

    return (
        <AdminWorkspacesClient
            initialData={initialData}
            currentPage={page}
            searchQuery={search}
        />
    );
}
