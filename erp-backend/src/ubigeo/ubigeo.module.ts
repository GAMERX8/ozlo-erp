import { Module } from '@nestjs/common';
import { UbigeoService } from './ubigeo.service';
import { UbigeoController } from './ubigeo.controller';

@Module({
  controllers: [UbigeoController],
  providers: [UbigeoService],
  exports: [UbigeoService],
})
export class UbigeoModule {}