import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { EventsHandlerService, DomainEventPayload } from '../services/events-handler.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Bildirishnomalar va Hodisalar integratsiyasi (Events & Dispatch)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EventsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly eventsHandler: EventsHandlerService,
  ) {}

  @Post('admin/notifications/send')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Foydalanuvchiga to\'g\'ridan-to\'g\'ri xabar yuborish (Kabinet + SMS)',
    description: 'Tanlangan shablon va o\'zgaruvchilar bo\'yicha foydalanuvchiga shaxsiy kabinet va SMS orqali xabar jo\'natish.',
  })
  @ApiResponse({ status: 201, description: 'Xabar muvaffaqiyatli yuborildi' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }

  @Post('events/emit')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Tizim hodisasini yuborish (Section 8: Hodisalar)',
    description: 'ArizaQabulQilindi, ImtihonNatijasiTasdiqlandi, ShartnomaImzolandi va boshqa hodisalarni yuborish hamda avtomatik xabarnoma generatsiyasini tekshirish.',
  })
  @ApiResponse({ status: 201, description: 'Hodisa qabul qilindi va qayta ishlandi' })
  async emitEvent(@Body() payload: DomainEventPayload) {
    return this.eventsHandler.handleEvent(payload);
  }
}
