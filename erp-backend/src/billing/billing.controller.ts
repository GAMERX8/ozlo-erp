import { 
    Controller, 
    Post, 
    Get, 
    Body, 
    Headers, 
    Request,
    UseGuards,
    Param,
    BadRequestException,
    RawBodyRequest,
    Req
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import { ApplyPromoCodeDto } from './dto/apply-promo-code.dto';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    // ==================== PLANS ====================

    @Get('plans')
    async getAvailablePlans() {
        return await this.billingService.getAvailablePlans();
    }

    @Get('credit-packs')
    getAvailableCreditPacks() {
        return this.billingService.getAvailableCreditPacks();
    }

    @UseGuards(JwtAuthGuard)
    @Get('status/:workspaceId')
    async getBillingStatus(
        @Request() req,
        @Param('workspaceId') workspaceId: string
    ) {
        return this.billingService.getWorkspaceBillingStatus(
            req.user.userId,
            workspaceId
        );
    }

    // ==================== CHECKOUT ====================

    @UseGuards(JwtAuthGuard)
    @Post('checkout')
    async createCheckoutSession(
        @Request() req,
        @Body() data: { workspace_id: string; plan: string }
    ) {
        return this.billingService.createCheckoutSession(
            req.user.userId,
            data.workspace_id,
            data.plan
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('checkout/credits')
    async createCreditCheckoutSession(
        @Request() req,
        @Body() data: { workspace_id: string; amount: number }
    ) {
        return this.billingService.createCreditCheckoutSession(
            req.user.userId,
            data.workspace_id,
            data.amount
        );
    }

    // ==================== UPGRADE/DOWNGRADE ====================

    @UseGuards(JwtAuthGuard)
    @Get('upgrade-info/:workspaceId/:plan')
    async getUpgradeInfo(
        @Request() req,
        @Param('workspaceId') workspaceId: string,
        @Param('plan') plan: string
    ) {
        return this.billingService.getUpgradeInfo(
            req.user.userId,
            workspaceId,
            plan
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('upgrade-checkout')
    async createUpgradeCheckout(
        @Request() req,
        @Body() data: UpgradePlanDto
    ) {
        return this.billingService.createUpgradeCheckoutSession(
            req.user.userId,
            data.workspace_id,
            data.plan,
            data.promo_code
        );
    }

    // ==================== CUSTOMER PORTAL ====================

    @UseGuards(JwtAuthGuard)
    @Post('portal')
    async createPortalSession(
        @Request() req,
        @Body() data: { workspace_id: string }
    ) {
        return this.billingService.createPortalSession(
            req.user.userId,
            data.workspace_id
        );
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    @UseGuards(JwtAuthGuard)
    @Post('subscriptions/:workspaceId/cancel')
    async cancelSubscription(
        @Request() req,
        @Param('workspaceId') workspaceId: string
    ) {
        return this.billingService.cancelSubscription(
            req.user.userId,
            workspaceId
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('subscriptions/:workspaceId/reactivate')
    async reactivateSubscription(
        @Request() req,
        @Param('workspaceId') workspaceId: string
    ) {
        return this.billingService.reactivateSubscription(
            req.user.userId,
            workspaceId
        );
    }

    // ==================== SYNC & DEBUG ====================

    @UseGuards(JwtAuthGuard)
    @Post('sync/:workspaceId')
    async syncWithStripe(
        @Request() req,
        @Param('workspaceId') workspaceId: string
    ) {
        return this.billingService.syncWithStripe(req.user.userId, workspaceId);
    }

    // ==================== PROMO CODES ====================

    @UseGuards(JwtAuthGuard)
    @Post('promo-code')
    async applyPromoCode(
        @Request() req,
        @Body() data: ApplyPromoCodeDto
    ) {
        return this.billingService.applyPromoCode(
            req.user.userId,
            data.workspace_id,
            data.promo_code
        );
    }

    // ==================== WEBHOOK (PUBLIC) ====================

    @Post('webhook')
    async handleWebhook(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string
    ) {
        if (!request.rawBody) {
            throw new BadRequestException('Missing body');
        }

        return this.billingService.handleWebhook(request.rawBody, signature);
    }

    
}
