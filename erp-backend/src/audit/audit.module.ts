import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';

@Global() // Hacemos el módulo global para poder usarlo en cualquier parte
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
