import { Module, forwardRef } from '@nestjs/common';
import { WppService } from './wpp.service';
import { WppController } from './wpp.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ApiKeysModule } from '../../api-keys/api-keys.module';

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [WppController],
  providers: [WppService],
  exports: [WppService],
})
export class WppModule {}
