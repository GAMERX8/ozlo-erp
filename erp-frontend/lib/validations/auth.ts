/**
 * Schemas de validación para autenticación
 */

import { z } from "zod";

/**
 * Schema para login
 */
export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
    password: z
        .string()
        .min(1, "La contraseña es requerida")
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema para registro
 */
export const registerSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(100, "La contraseña es muy larga"),
    first_name: z
        .string()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(50, "El nombre es muy largo")
        .optional()
        .or(z.literal("")),
    last_name: z
        .string()
        .min(2, "El apellido debe tener al menos 2 caracteres")
        .max(50, "El apellido es muy largo")
        .optional()
        .or(z.literal("")),
    phone: z
        .string()
        .min(8, "El teléfono debe tener al menos 8 caracteres")
        .max(20, "El teléfono es muy largo")
        .optional()
        .or(z.literal("")),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema para cambiar contraseña
 */
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida"),
    newPassword: z
        .string()
        .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Schema para recuperar contraseña
 */
export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema para resetear contraseña
 */
export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token requerido"),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Schema para verificación de email
 */
export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token de verificación requerido"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
