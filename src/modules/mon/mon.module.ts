import { Module } from '@nestjs/common';
import { MonController } from './mon.controller';
import { MonService } from './mon.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [MonController], providers: [MonService] })
export class MonModule {}
