/**
 * Tipos relacionados con usuarios y autenticación
 */

/**
 * Rol de usuario en la aplicación
 */
export type UserRole = "super_admin" | "admin" | "member";

/**
 * Proveedor de autenticación
 */
export type AuthProvider = "credentials" | "google" | "github";

/**
 * Usuario base
 */
export interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: UserRole;
    avatar?: string | null;
    provider?: AuthProvider;
    email_verified?: boolean;
    mfa_enabled?: boolean;
    date_created?: string;
}

/**
 * Perfil de usuario (para /workspaces/[workspaceId]/account)
 */
export interface UserProfile {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    mfa_enabled?: boolean;
}

/**
 * Datos para registrar usuario
 */
export interface RegisterUserData {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
}

/**
 * Datos para actualizar perfil
 */
export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
}

/**
 * Datos para cambiar contraseña
 */
export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

/**
 * Sesión del usuario (NextAuth)
 */
export interface UserSession {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    avatar?: string;
    provider?: AuthProvider;
    access_token?: string;
    mfa_required?: boolean;
}
