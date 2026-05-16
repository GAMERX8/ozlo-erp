import { Module } from '@nestjs/common';
import { CashClosuresService } from './cash-closures.service';
import { CashClosuresController } from './cash-closures.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CashClosuresController],
  providers: [CashClosuresService],
  exports: [CashClosuresService],
})
export class CashClosuresModule {}
