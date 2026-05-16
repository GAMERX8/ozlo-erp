"use server";

import { API_URL } from "./config";
import { getAuthHeaders } from "./auth-helpers";

// ─────────────────────────────────────────────
// Get Available Plans
// ─────────────────────────────────────────────
export async function getAvailablePlans() {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/billing/plans`, {
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            return { error: "Error al obtener planes" };
        }

        const plans = await response.json();
        return { success: true, plans };
    } catch (error: any) {
        console.error("getAvailablePlans error:", error.message);
        return { error: error.message || "Error al obtener planes" };
    }
}

// ─────────────────────────────────────────────
// Get Workspace Billing Status
// ─────────────────────────────────────────────
export async function getWorkspaceBillingStatus(workspaceId: string) {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_URL}/billing/status/${workspaceId}`, {
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            return { error: "Error al obtener estado de billing" };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        console.error("getWorkspaceBillingStatus error:", error.message);
        return { error: error.message || "Error al obtener estado" };
    }
}

// ─────────────────────────────────────────────
// Create Stripe Checkout Session (con selección de plan)
// ─────────────────────────────────────────────
export async function createCheckoutSession({
    workspaceId,
    plan,
    successUrl,
    cancelUrl,
}: {
    workspaceId: string;
    plan: string;
    successUrl: string;
    cancelUrl: string;
}) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/checkout`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                plan: plan,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al crear sesión de checkout" };
        }

        const data = await response.json();
        return { success: true, checkoutUrl: data.url };
    } catch (error: any) {
        console.error("createCheckoutSession error:", error.message);
        return { error: error.message || "Error al iniciar el proceso de pago" };
    }
}

// ─────────────────────────────────────────────
// Get Upgrade Info (para mostrar diálogo de confirmación)
// ─────────────────────────────────────────────
export async function getUpgradeInfo(workspaceId: string, newPlan: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/upgrade-info/${workspaceId}/${newPlan}`, {
            headers,
            cache: 'no-store'
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al obtener información del upgrade" };
        }

        const data = await response.json();
        return { success: true, ...data };
    } catch (error: any) {
        console.error("getUpgradeInfo error:", error.message);
        return { error: error.message || "Error al obtener información" };
    }
}

// ─────────────────────────────────────────────
// Create Upgrade Checkout Session (pago inmediato de diferencia)
// ─────────────────────────────────────────────
export async function createUpgradeCheckout(workspaceId: string, newPlan: string, promoCode?: string) {
    try {
        const headers = await getAuthHeaders();
        
        const body: any = {
            workspace_id: workspaceId,
            plan: newPlan,
        };
        
        if (promoCode) {
            body.promo_code = promoCode;
        }
        
        const response = await fetch(`${API_URL}/billing/upgrade-checkout`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al crear sesión de pago" };
        }

        const data = await response.json();
        
        // Si hay URL de checkout, redirigir
        if (data.url) {
            return { success: true, checkoutUrl: data.url };
        }
        
        return { success: true, ...data };
    } catch (error: any) {
        console.error("createUpgradeCheckout error:", error.message);
        return { error: error.message || "Error al crear sesión de pago" };
    }
}

// ─────────────────────────────────────────────
// Upgrade/Downgrade Plan (legacy, ahora se usa createUpgradeCheckout)
// ─────────────────────────────────────────────
export async function upgradePlan(workspaceId: string, newPlan: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/upgrade-checkout`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                plan: newPlan,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al cambiar de plan" };
        }

        const data = await response.json();
        
        // Si hay URL de checkout, redirigir
        if (data.url) {
            return { success: true, checkoutUrl: data.url };
        }
        
        return { success: true, ...data };
    } catch (error: any) {
        console.error("upgradePlan error:", error.message);
        return { error: error.message || "Error al cambiar de plan" };
    }
}

// ─────────────────────────────────────────────
// Create Stripe Billing Portal Session
// ─────────────────────────────────────────────
export async function createBillingPortalSession({
    workspaceId,
    returnUrl,
}: {
    workspaceId: string;
    returnUrl: string;
}) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/portal`, {
            method: "POST",
            headers,
            body: JSON.stringify({ workspace_id: workspaceId }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al crear portal" };
        }

        const data = await response.json();
        return { success: true, portalUrl: data.url };
    } catch (error: any) {
        console.error("createBillingPortalSession error:", error.message);
        return { error: error.message || "Error al abrir el portal de facturación" };
    }
}

// ─────────────────────────────────────────────
// Cancel Subscription
// ─────────────────────────────────────────────
export async function cancelWorkspaceSubscription(workspaceId: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/subscriptions/${workspaceId}/cancel`, {
            method: "POST",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al cancelar suscripción" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("cancelWorkspaceSubscription error:", error.message);
        return { error: error.message || "Error al cancelar suscripción" };
    }
}

// ─────────────────────────────────────────────
// Reactivate Subscription
// ─────────────────────────────────────────────
export async function reactivateWorkspaceSubscription(workspaceId: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/subscriptions/${workspaceId}/reactivate`, {
            method: "POST",
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al reactivar suscripción" };
        }

        return { success: true };
    } catch (error: any) {
        console.error("reactivateWorkspaceSubscription error:", error.message);
        return { error: error.message || "Error al reactivar suscripción" };
    }
}

// ─────────────────────────────────────────────
// Pay during Grace Period (update payment method)
// ─────────────────────────────────────────────
export async function payDuringGracePeriod(workspaceId: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/grace-period/pay`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al acceder al portal de pago" };
        }

        const data = await response.json();
        return { success: true, portalUrl: data.url };
    } catch (error: any) {
        console.error("payDuringGracePeriod error:", error.message);
        return { error: error.message || "Error al abrir el portal de pago" };
    }
}

// ─────────────────────────────────────────────
// Create Stripe Checkout Session for Credits
// ─────────────────────────────────────────────
export async function createCreditCheckoutSession(workspaceId: string, amount: number) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/checkout/credits`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                amount: amount,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Error al crear sesión de checkout para créditos" };
        }

        const data = await response.json();
        return { success: true, checkoutUrl: data.url };
    } catch (error: any) {
        console.error("createCreditCheckoutSession error:", error.message);
        return { error: error.message || "Error al iniciar el proceso de pago" };
    }
}

// ─────────────────────────────────────────────
// Apply Promo Code (aplicar código promocional)
// ─────────────────────────────────────────────
export async function applyPromoCode(workspaceId: string, promoCode: string) {
    try {
        const headers = await getAuthHeaders();
        
        const response = await fetch(`${API_URL}/billing/promo-code`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                promo_code: promoCode,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.message || "Código no válido" };
        }

        const data = await response.json();
        return { success: true, ...data };
    } catch (error: any) {
        console.error("applyPromoCode error:", error.message);
        return { error: error.message || "Error al aplicar el código" };
    }
}
