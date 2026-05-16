/**
 * Schemas de validación para workspaces
 */

import { z } from "zod";

/**
 * Regex para validar slugs: solo letras minúsculas, números y guiones
 */
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * Schema para crear workspace
 */
export const createWorkspaceSchema = z.object({
    name: z
        .string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(50, "El nombre no puede tener más de 50 caracteres"),
    slug: z
        .string()
        .min(3, "El slug debe tener al menos 3 caracteres")
        .max(50, "El slug no puede tener más de 50 caracteres")
        .regex(SLUG_REGEX, "El slug solo puede contener letras minúsculas, números y guiones")
        .optional()
        .or(z.literal("")),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

/**
 * Schema para actualizar workspace
 */
export const updateWorkspaceSchema = z.object({
    name: z
        .string()
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(50, "El nombre no puede tener más de 50 caracteres")
        .optional(),
    phone: z
        .string()
        .max(20, "Teléfono muy largo")
        .optional()
        .or(z.literal("")),
    website: z
        .string()
        .url("URL inválida")
        .max(200, "URL muy larga")
        .optional()
        .or(z.literal("")),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

/**
 * Schema para invitar miembro
 */
export const inviteMemberSchema = z.object({
    email: z
        .string()
        .min(1, "El email es requerido")
        .email("Email inválido"),
    role: z.enum(["admin", "member"] as const).default("member"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/**
 * Schema para validar slug de workspace
 */
export const workspaceSlugSchema = z.object({
    slug: z
        .string()
        .min(1, "Slug requerido")
        .regex(SLUG_REGEX, "Slug inválido"),
});

export type WorkspaceSlugInput = z.infer<typeof workspaceSlugSchema>;
