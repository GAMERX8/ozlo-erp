import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AssistantContextService } from './assistant-context.service';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
  imports: [PrismaModule, StorageModule, WorkspacesModule, BillingModule],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantContextService],
  exports: [AssistantService],
})
export class AssistantModule {}
