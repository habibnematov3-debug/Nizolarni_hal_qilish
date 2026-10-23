import { Module } from '@nestjs/common';
import { IntController } from './int.controller';
import { IntService } from './int.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [IntController], providers: [IntService] })
export class IntModule {}
