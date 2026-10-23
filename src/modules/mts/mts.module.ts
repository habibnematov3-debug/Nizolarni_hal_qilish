import { Module } from '@nestjs/common';
import { MtsController } from './mts.controller';
import { MtsService } from './mts.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [MtsController], providers: [MtsService] })
export class MtsModule {}
