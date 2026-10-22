import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationTemplatesService } from './services/notification-templates.service';
import { TimersService } from './services/timers.service';
import { TemplateEngineService } from './services/template-engine.service';
import { SmsAdapter } from './adapters/sms.adapter';
import { EventsHandlerService } from './services/events-handler.service';
import { CabinetNotificationsController } from './controllers/cabinet-notifications.controller';
import { AdminTemplatesController } from './controllers/admin-templates.controller';
import { AdminTimersController } from './controllers/admin-timers.controller';
import { EventsController } from './controllers/events.controller';

@Module({
  providers: [
    NotificationsService,
    NotificationTemplatesService,
    TimersService,
    TemplateEngineService,
    SmsAdapter,
    EventsHandlerService,
  ],
  controllers: [
    CabinetNotificationsController,
    AdminTemplatesController,
    AdminTimersController,
    EventsController,
  ],
  exports: [
    NotificationsService,
    TimersService,
    EventsHandlerService,
  ],
})
export class NotificationsModule {}
