import { Module } from '@nestjs/common';
import { WppModule } from './wpp/wpp.module';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [WppModule],
  providers: [IntegrationsService],
  exports: [IntegrationsService, WppModule],
})
export class IntegrationsModule {}
