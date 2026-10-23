import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminContractTemplatesController, ShaController } from './sha.controller';
import { ShaService } from './sha.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ShaController, AdminContractTemplatesController],
  providers: [ShaService],
  exports: [ShaService],
})
export class ShaModule {}
