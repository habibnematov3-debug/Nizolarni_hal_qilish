import { Module } from '@nestjs/common';
import { MtsController } from './mts.controller';
import { MtsService } from './mts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonModule } from '../mon/mon.module';

@Module({ imports: [NotificationsModule, MonModule], controllers: [MtsController], providers: [MtsService] })
export class MtsModule {}
