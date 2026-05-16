import { auth } from "@/auth";

/**
 * Helper para obtener headers con autenticación en Server Actions
 * @returns Headers con Content-Type y Authorization si hay sesión
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    const session = await auth();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    return headers;
}

/**
 * Helper para obtener solo el token de acceso
 * @returns El access_token o null si no hay sesión
 */
export async function getAccessToken(): Promise<string | null> {
    const session = await auth();
    return session?.access_token || null;
}
