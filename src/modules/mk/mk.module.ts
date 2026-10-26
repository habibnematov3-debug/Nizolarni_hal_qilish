import { Module } from '@nestjs/common';
import { MkController } from './mk.controller';
import { MkService } from './mk.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformModule } from '../platform/platform.module';

@Module({ imports: [NotificationsModule, PlatformModule], controllers: [MkController], providers: [MkService] })
export class MkModule {}
