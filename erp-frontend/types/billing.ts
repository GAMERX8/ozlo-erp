/**
 * Tipos relacionados con facturación y planes
 */

import type { WorkspacePlan } from "./workspace";

/**
 * Configuración de un plan
 */
export interface PlanConfig {
    id: WorkspacePlan;
    name: string;
    price: number;
    includedInstances: number;
    extraInstancePrice: number;
    features: string[];
}

/**
 * Estado de facturación de un workspace
 */
export interface BillingStatus {
    plan: WorkspacePlan;
    planStatus: "active" | "pending" | "past_due" | "canceled" | "trialing";
    isActive: boolean;
    isPastDue: boolean;
    isPendingCancellation: boolean;
    cancelAtPeriodEnd: boolean;
    cancellationDate: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    creditBalance: number;
    limits: {
        name: string;
        features: any;
    } | null;
}

/**
 * Sesión de checkout
 */
export interface CheckoutSession {
    checkoutUrl: string;
    sessionId: string;
}

/**
 * Portal de facturación
 */
export interface BillingPortal {
    portalUrl: string;
}

/**
 * Datos para crear sesión de checkout
 */
export interface CreateCheckoutData {
    workspaceId: string;
    plan: WorkspacePlan;
    successUrl: string;
    cancelUrl: string;
}

/**
 * Item de factura/resumen
 */
export interface InvoiceItem {
    description: string;
    amount: number;
    quantity?: number;
    period?: {
        start: string;
        end: string;
    };
}
