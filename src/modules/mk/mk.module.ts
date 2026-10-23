import { Module } from '@nestjs/common';
import { MkController } from './mk.controller';
import { MkService } from './mk.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [MkController], providers: [MkService] })
export class MkModule {}
