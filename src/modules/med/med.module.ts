import { Module } from '@nestjs/common';
import { MedController } from './med.controller';
import { MedService } from './med.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [MedController],
  providers: [MedService],
})
export class MedModule {}
