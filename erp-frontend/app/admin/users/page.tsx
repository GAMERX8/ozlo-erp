import type { Metadata } from "next";
import { getAdminUsers } from "@/lib/admin-actions";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
    title: `Gestión de Usuarios - Admin - ${APP_NAME}`,
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        search?: string;
    }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const search = params.search;

    const result = await getAdminUsers({ page, limit: 20, search });

    // El backend devuelve { data: users[], meta: {...} }
    const users = result.success ? result.data?.data || [] : [];
    const total = result.success ? result.data?.meta?.total || 0 : 0;
    const totalPages = result.success ? result.data?.meta?.totalPages || 1 : 1;

    const initialData = {
        data: users,
        meta: {
            total,
            page,
            limit: 20,
            totalPages,
        },
    };

    return (
        <AdminUsersClient
            initialData={initialData}
            currentPage={page}
            searchQuery={search}
        />
    );
}
