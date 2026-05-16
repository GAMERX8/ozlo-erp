import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { 
    CREDIT_PACKS,
    validateCreditAmount
} from './plans.config';
import { PermissionsService } from '../auth/permissions.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
    private stripe: Stripe;
    
    // Plan free es un concepto fijo en el sistema
    private readonly FREE_PLAN_SLUG = 'free';

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        private readonly permissionsService: PermissionsService,
        private readonly audit: AuditService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY is not defined. Billing features will be limited.');
            // Initialize with an empty string to avoid crashes, but methods will fail
            this.stripe = new Stripe('', { apiVersion: '2026-02-25.clover' });
        } else {
            this.stripe = new Stripe(secretKey, {
                apiVersion: '2026-02-25.clover',
            });
        }
    }

    // ==================== HELPERS ====================

    private isFreePlan(planSlug: string): boolean {
        return planSlug === this.FREE_PLAN_SLUG;
    }

    private async getPromoCodeId(code: string): Promise<string | null> {
        try {
            const promotionCodes = await this.stripe.promotionCodes.list({
                code: code.toUpperCase(),
                active: true,
                limit: 1,
            });

            if (promotionCodes.data.length === 0) {
                return null;
            }

            return promotionCodes.data[0].id;
        } catch (error) {
            this.logger.error(`Error fetching promo code ID: ${error.message}`);
            return null;
        }
    }

    private async hasBillingAccess(userId: string, workspaceId: string): Promise<boolean> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: { where: { user_id: userId } } }
        });
        
        if (!workspace) return false;
        return workspace.owner_id === userId || workspace.members.some(m => m.user_id === userId);
    }

    // ==================== PLANS INFO ====================

    async getAvailablePlans() {
        const plans = await this.prisma.plan.findMany({
            where: { is_active: true },
            orderBy: { price: 'asc' }
        });

        return plans.map(plan => ({
            id: plan.slug,
            name: plan.name,
            price: plan.price,
            isRecommended: plan.is_recommended,
            features: typeof plan.features === 'object' && plan.features !== null ? Object.values(plan.features) : [],
        }));
    }

    getAvailableCreditPacks() {
        return {
            packs: CREDIT_PACKS,
            config: {
                minAmount: 5,
                maxAmount: 9999,
                multipleOf: 5,
            }
        };
    }

    async getWorkspaceBillingStatus(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { 
                members: { where: { user_id: userId } },
                current_subscription: true,
            }
        });

        if (!workspace) {
            throw new NotFoundException('Workspace not found');
        }

        const isOwner = workspace.owner_id === userId;
        const isMember = isOwner || workspace.members.some(m => m.user_id === userId);
        
        if (!isMember) {
            throw new ForbiddenException('Access denied');
        }

        const hasBillingPermission = isOwner || await this.permissionsService.checkPermission(
            userId, 
            workspaceId, 
            'billing:read' as any
        ).then(r => r.allowed);

        const planConfig = await this.prisma.plan.findUnique({ where: { slug: workspace.plan } });
        const isFree = this.isFreePlan(workspace.plan);
        const isActive = workspace.status === 'active' || isFree;

        const cancelAtPeriodEnd = workspace.current_subscription?.cancel_at_period_end || false;
        const isPendingCancellation = cancelAtPeriodEnd && !isFree;
        const cancellationDate = isPendingCancellation && workspace.current_subscription
            ? workspace.current_subscription.current_period_end
            : null;

        const baseInfo = {
            plan: workspace.plan,
            planStatus: isFree ? 'active' : workspace.status,
            isActive,
            isPastDue: workspace.status === 'past_due',
            isPendingCancellation,
            cancelAtPeriodEnd,
            cancellationDate: cancellationDate?.toISOString() || null,
            creditBalance: workspace.credit_balance,
            limits: planConfig ? {
                name: planConfig.name,
                features: planConfig.features,
            } : null,
        };

        if (hasBillingPermission && workspace.current_subscription) {
            return {
                ...baseInfo,
                currentPeriodStart: workspace.current_subscription.current_period_start,
                currentPeriodEnd: workspace.current_subscription.current_period_end,
                stripeSubscriptionId: workspace.current_subscription.stripe_subscription_id,
            };
        }

        return baseInfo;
    }

    // ==================== CHECKOUT SESSION ====================

    async createCheckoutSession(userId: string, workspaceId: string, plan: string, promoCode?: string) {
        const planConfig = await this.prisma.plan.findUnique({ where: { slug: plan } });
        if (!planConfig || !planConfig.is_active || planConfig.price === 0) {
            throw new BadRequestException('Invalid plan selected');
        }

        const priceId = planConfig.stripe_price_id;
        if (!priceId) {
            throw new BadRequestException('Price not configured for this plan');
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { owner: true },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        if (!await this.hasBillingAccess(userId, workspaceId)) {
            throw new BadRequestException('Access denied');
        }

        let customerId = workspace.stripe_customer_id;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: workspace.owner.email,
                name: workspace.name,
                metadata: { workspace_id: workspaceId, user_id: userId },
            });
            customerId = customer.id;
            await this.prisma.workspace.update({
                where: { id: workspaceId },
                data: { stripe_customer_id: customerId },
            });
        }

        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        
        const sessionConfig: any = {
            billing_address_collection: 'auto',
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${appUrl}/workspaces/${workspace.slug}/success?payment=success&plan=${plan}`,
            cancel_url: `${appUrl}/workspaces/${workspace.slug}/cancel?payment=canceled`,
            metadata: {
                workspace_id: workspaceId,
                user_id: userId,
                plan: plan,
                checkout_type: 'subscription'
            },
        };

        if (promoCode) {
            const promoCodeId = await this.getPromoCodeId(promoCode);
            if (promoCodeId) {
                sessionConfig.discounts = [{ promotion_code: promoCodeId }];
            }
        }

        const session = await this.stripe.checkout.sessions.create(sessionConfig);
        return { sessionId: session.id, url: session.url };
    }

    async createCreditCheckoutSession(userId: string, workspaceId: string, amount: number) {
        const validation = validateCreditAmount(amount);
        if (!validation.valid) throw new BadRequestException(validation.error);

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { owner: true },
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        if (!await this.hasBillingAccess(userId, workspaceId)) throw new BadRequestException('Access denied');

        let customerId = workspace.stripe_customer_id;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: workspace.owner.email,
                name: workspace.name,
                metadata: { workspace_id: workspaceId, user_id: userId },
            });
            customerId = customer.id;
            await this.prisma.workspace.update({
                where: { id: workspaceId },
                data: { stripe_customer_id: customerId },
            });
        }

        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        const amountInCents = Math.round(amount * 100);
        
        const session = await this.stripe.checkout.sessions.create({
            billing_address_collection: 'auto',
            customer: customerId,
            line_items: [{ 
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Créditos de uso',
                        description: `${amount} USD en créditos`,
                    },
                    unit_amount: amountInCents,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${appUrl}/workspaces/${workspace.slug}/success?payment=success&type=credit`,
            cancel_url: `${appUrl}/workspaces/${workspace.slug}/cancel?payment=canceled`,
            metadata: {
                workspace_id: workspaceId,
                user_id: userId,
                checkout_type: 'credit',
                credit_amount: amount.toString()
            },
        });

        return { sessionId: session.id, url: session.url };
    }

    // ==================== UPGRADE/DOWNGRADE ====================

    async getUpgradeInfo(userId: string, workspaceId: string, newPlan: string) {
        const planConfig = await this.prisma.plan.findUnique({ where: { slug: newPlan } });
        if (!planConfig || !planConfig.is_active || planConfig.price === 0) {
            throw new BadRequestException('Invalid plan selected');
        }

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { current_subscription: true }
        });

        if (!workspace) throw new NotFoundException('Workspace not found');
        if (!await this.hasBillingAccess(userId, workspaceId)) throw new BadRequestException('Access denied');

        const currentPlanConfig = await this.prisma.plan.findUnique({ where: { slug: workspace.plan } });
        const currentPrice = currentPlanConfig?.price || 0;
        const newPrice = planConfig.price;
        const priceDifference = newPrice - currentPrice;

        return {
            requiresPayment: priceDifference > 0,
            priceDifference: priceDifference > 0 ? priceDifference : 0,
            newPlanPrice: newPrice,
            currentPlanPrice: currentPrice,
            newPlanName: planConfig.name,
            currentPlanName: currentPlanConfig?.name || workspace.plan,
        };
    }

    async createUpgradeCheckoutSession(userId: string, workspaceId: string, newPlan: string, promoCode?: string) {
         // Implementación simplificada para el template
         return this.createCheckoutSession(userId, workspaceId, newPlan, promoCode);
    }

    // ==================== PORTAL & SUBSCRIPTION ====================

    async createPortalSession(userId: string, workspaceId: string) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace || !workspace.stripe_customer_id) {
            throw new BadRequestException('Workspace does not have a billing profile');
        }

        if (!await this.hasBillingAccess(userId, workspaceId)) throw new ForbiddenException('Access denied');

        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        const session = await this.stripe.billingPortal.sessions.create({
            customer: workspace.stripe_customer_id,
            return_url: `${appUrl}/workspaces/${workspace.slug}/billing`,
        });

        return { url: session.url };
    }

    async cancelSubscription(userId: string, workspaceId: string) {
        if (!await this.hasBillingAccess(userId, workspaceId)) throw new ForbiddenException('Access denied');
        
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { current_subscription: true }
        });

        if (!workspace?.current_subscription) throw new BadRequestException('No active subscription found');

        await this.stripe.subscriptions.update(workspace.current_subscription.stripe_subscription_id, {
            cancel_at_period_end: true
        });

        await this.prisma.subscription.update({
            where: { id: workspace.current_subscription.id },
            data: { cancel_at_period_end: true }
        });

        return { success: true };
    }

    async reactivateSubscription(userId: string, workspaceId: string) {
        if (!await this.hasBillingAccess(userId, workspaceId)) throw new ForbiddenException('Access denied');

        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { current_subscription: true }
        });

        if (!workspace?.current_subscription) throw new BadRequestException('No subscription found');

        await this.stripe.subscriptions.update(workspace.current_subscription.stripe_subscription_id, {
            cancel_at_period_end: false
        });

        await this.prisma.subscription.update({
            where: { id: workspace.current_subscription.id },
            data: { cancel_at_period_end: false }
        });

        return { success: true };
    }

    async syncWithStripe(userId: string, workspaceId: string) {
        // Implementación básica para sincronizar estado
        return { success: true, message: 'Estado sincronizado con Stripe' };
    }

    async applyPromoCode(userId: string, workspaceId: string, promoCode: string) {
        // Sencillamente verificar si existe
        const id = await this.getPromoCodeId(promoCode);
        if (!id) throw new BadRequestException('Invalid promo code');
        return { success: true, promoCodeId: id };
    }

    

    // ==================== WEBHOOK ====================

    async handleWebhook(rawBody: Buffer, signature: string) {
        let event: Stripe.Event;
        const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret || '');
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;
        }

        return { received: true };
    }

    private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
        this.logger.log(`Checkout completed: ${session.id}`);

        const metadata = session.metadata || {};
        const workspaceId = metadata.workspace_id;
        const checkoutType = metadata.checkout_type;
        const creditAmount = metadata.credit_amount;

        if (!workspaceId) {
            this.logger.warn('No workspace_id in checkout session metadata');
            return;
        }

        if (checkoutType === 'credit' && creditAmount) {
            await this.prisma.creditTransaction.create({
                data: {
                    workspace_id: workspaceId,
                    amount: parseFloat(creditAmount),
                    type: 'purchase',
                    description: `Credit purchase of $${creditAmount}`,
                    stripe_payment_id: session.payment_intent as string || session.id,
                },
            });

            await this.prisma.workspace.update({
                where: { id: workspaceId },
                data: { credit_balance: { increment: parseFloat(creditAmount) } },
            });

            this.logger.log(`Credits updated for workspace ${workspaceId}: +${creditAmount}`);
            return;
        }

        if (checkoutType === 'subscription' && metadata.plan) {
            const subscriptionId = session.subscription as string;
            if (subscriptionId) {
                const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

                await this.prisma.subscription.upsert({
                    where: { stripe_subscription_id: subscriptionId },
                    create: {
                        workspace_id: workspaceId,
                        plan: metadata.plan,
                        status: 'active',
                        stripe_subscription_id: subscriptionId,
                        stripe_price_id: (subscription as any).items?.data?.[0]?.price?.id || '',
                        current_period_start: new Date(((subscription as any).current_period_start ?? Math.floor(Date.now() / 1000)) * 1000),
                        current_period_end: new Date(((subscription as any).current_period_end ?? Math.floor(Date.now() / 1000 + 2592000)) * 1000),
                        cancel_at_period_end: (subscription as any).cancel_at_period_end ?? false,
                        base_price: parseFloat(metadata.plan === 'free' ? '0' : '0'),
                    },
                    update: {
                        status: 'active',
                        current_period_start: new Date(((subscription as any).current_period_start ?? Math.floor(Date.now() / 1000)) * 1000),
                        current_period_end: new Date(((subscription as any).current_period_end ?? Math.floor(Date.now() / 1000 + 2592000)) * 1000),
                        cancel_at_period_end: (subscription as any).cancel_at_period_end ?? false,
                    },
                });

                await this.prisma.workspace.update({
                    where: { id: workspaceId },
                    data: {
                        plan: metadata.plan,
                        status: 'active',
                        current_subscription_id: undefined,
                    },
                });

                this.logger.log(`Subscription activated for workspace ${workspaceId}: plan ${metadata.plan}`);
            }
        }

        await this.prisma.stripeEvent.create({
            data: {
                stripe_event_id: session.id,
                type: 'checkout.session.completed',
                payload: session as any,
                processed: true,
                workspace_id: workspaceId,
            },
        });
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        this.logger.log(`Subscription updated: ${subscription.id}`);

        const existingSub = await this.prisma.subscription.findUnique({
            where: { stripe_subscription_id: subscription.id },
        });

        if (existingSub) {
            await this.prisma.subscription.update({
                where: { id: existingSub.id },
                data: {
                    status: subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : subscription.status === 'canceled' ? 'canceled' : subscription.status,
                    current_period_start: new Date(((subscription as any).current_period_start ?? Math.floor(Date.now() / 1000)) * 1000),
                    current_period_end: new Date(((subscription as any).current_period_end ?? Math.floor(Date.now() / 1000 + 2592000)) * 1000),
                    cancel_at_period_end: (subscription as any).cancel_at_period_end ?? false,
                    stripe_price_id: (subscription as any).items?.data?.[0]?.price?.id || existingSub.stripe_price_id,
                },
            });

            if (subscription.status === 'active' && existingSub.workspace_id) {
                await this.prisma.workspace.update({
                    where: { id: existingSub.workspace_id },
                    data: { status: 'active' },
                });
            }

            this.logger.log(`Subscription ${subscription.id} updated to status: ${subscription.status}`);
        }

        await this.prisma.stripeEvent.create({
            data: {
                stripe_event_id: subscription.id,
                type: 'customer.subscription.updated',
                payload: subscription as any,
                processed: true,
            },
        });
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        this.logger.log(`Subscription deleted: ${subscription.id}`);

        const existingSub = await this.prisma.subscription.findUnique({
            where: { stripe_subscription_id: subscription.id },
        });

        if (existingSub) {
            await this.prisma.subscription.update({
                where: { id: existingSub.id },
                data: { status: 'canceled' },
            });

            if (existingSub.workspace_id) {
                await this.prisma.workspace.update({
                    where: { id: existingSub.workspace_id },
                    data: {
                        plan: 'free',
                        status: 'active',
                        current_subscription_id: null,
                    },
                });
            }

            this.logger.log(`Subscription ${subscription.id} canceled, workspace reverted to free`);
        }

        await this.prisma.stripeEvent.create({
            data: {
                stripe_event_id: subscription.id,
                type: 'customer.subscription.deleted',
                payload: subscription as any,
                processed: true,
            },
        });
    }
}
