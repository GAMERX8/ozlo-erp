import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { getAuditLogs, getAuditActions } from "@/lib/admin-actions";
import { AuditLogsClient } from "@/components/admin/audit-logs-client";

export const metadata: Metadata = {
    title: `Registros de Auditoría - Admin - ${APP_NAME}`,
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        action?: string;
        [key: string]: string | string[] | undefined;
    }>;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = params.page ? parseInt(params.page, 10) : 1;
    const action = params.action;

    const [logsData, actionsData] = await Promise.all([
        getAuditLogs({
            offset: (page - 1) * 20,
            limit: 20,
            action: action === "all" ? undefined : action
        }),
        getAuditActions(),
    ]);

    const logs = logsData.success ? logsData.data?.logs || [] : [];
    const total = logsData.success ? logsData.data?.total || 0 : 0;
    const actions = actionsData.success ? actionsData.data || [] : [];

    return (
        <AuditLogsClient
            initialData={{
                data: logs,
                meta: {
                    total,
                    page,
                    limit: 20,
                    totalPages: Math.ceil(total / 20),
                },
                actions,
            }}
            currentPage={page}
            actionFilter={action}
        />
    );
}
