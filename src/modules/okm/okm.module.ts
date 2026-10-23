import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { OkmController } from './okm.controller';
import { OkmService } from './okm.service';

@Module({
  imports: [NotificationsModule],
  controllers: [OkmController],
  providers: [OkmService],
})
export class OkmModule {}
