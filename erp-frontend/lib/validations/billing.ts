/**
 * Schemas de validación para facturación
 */

import { z } from "zod";

/**
 * Schema para crear sesión de checkout
 */
export const createCheckoutSchema = z.object({
    workspaceId: z.string().min(1, "Workspace requerido"),
    plan: z.string().min(1, "Plan requerido"),
    successUrl: z.string().url("URL de éxito inválida"),
    cancelUrl: z.string().url("URL de cancelación inválida"),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

/**
 * Schema para crear portal de facturación
 */
export const createPortalSchema = z.object({
    workspaceId: z.string().min(1, "Workspace requerido"),
    returnUrl: z.string().url("URL de retorno inválida"),
});

export type CreatePortalInput = z.infer<typeof createPortalSchema>;

/**
 * Schema para upgrade de plan
 */
export const upgradePlanSchema = z.object({
    workspaceId: z.string().min(1, "Workspace requerido"),
    plan: z.string().min(1, "Plan requerido"),
});

export type UpgradePlanInput = z.infer<typeof upgradePlanSchema>;

/**
 * Schema para cancelar suscripción
 */
export const cancelSubscriptionSchema = z.object({
    workspaceId: z.string().min(1, "Workspace requerido"),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
