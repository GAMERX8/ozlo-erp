import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { BillingModule } from './billing/billing.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AdminModule } from './admin/admin.module';
import { MfaModule } from './mfa/mfa.module';
import { AuditModule } from './audit/audit.module';
import { AssistantModule } from './assistant/assistant.module';
import { StorageModule } from './storage/storage.module';
import { UbigeoModule } from './ubigeo/ubigeo.module';
import { ClientsModule } from './clients/clients.module';
import { CategoriesModule } from './categories/categories.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CouriersModule } from './couriers/couriers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { CashClosuresModule } from './cash-closures/cash-closures.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OperationsModule } from './operations/operations.module';
import { ApiKeysModule } from './api-keys/api-keys.module';


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        AuthModule,
        WorkspacesModule,
        BillingModule,
        InvitationsModule,
        AdminModule,
        MfaModule,
        AuditModule,
        StorageModule,
        AssistantModule,
        UbigeoModule,
        ClientsModule,
        CategoriesModule,
        WarehousesModule,
        InventoryModule,
        ProductsModule,
        OrdersModule,
        CouriersModule,
        SuppliersModule,
        PurchasesModule,
        SupportTicketsModule,
        CashClosuresModule,
        DashboardModule,
        OperationsModule,
        ApiKeysModule,
        
    ],
})
export class AppModule { }