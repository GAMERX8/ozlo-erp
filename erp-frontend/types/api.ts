/**
 * Tipos para respuestas de API y manejo de errores
 */

/**
 * Resultado tipado para operaciones que pueden fallar
 * Reemplaza el patrón { data?: T, error?: string }
 */
export type Result<T, E = string> =
    | { success: true; data: T; error?: never }
    | { success: false; error: E; data?: never };

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

/**
 * Paginación estándar
 */
export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Opciones para queries
 */
export interface QueryOptions {
    enabled?: boolean;
    refetchInterval?: number;
    cacheTime?: number;
}
