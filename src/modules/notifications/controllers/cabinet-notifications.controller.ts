import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Kabinet bildirishnomalari (Cabinet Notifications)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cabinet/notifications')
export class CabinetNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Shaxsiy kabinetdagi xabarlar ro\'yxati (FT-BIL-04 / BIL-04)',
    description: 'Foydalanuvchining shaxsiy kabinetidagi barcha bildirishnomalari tarixi, o\'qilmagan xabarlar soni va filtrlash imkoniyati.',
  })
  @ApiResponse({ status: 200, description: 'Xabarlar ro\'yxati va sahifalash' })
  async getNotifications(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.getUserNotifications(user.id, query);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Xabarni o\'qilgan deb belgilash (BIL-04)',
    description: 'Tanlangan bildirishnomani o\'qilgan (isRead: true, status: READ) holatiga o\'tkazish.',
  })
  @ApiParam({ name: 'id', description: 'Bildirishnoma ID si' })
  @ApiResponse({ status: 200, description: 'Xabar o\'qilgan deb belgilandi' })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({
    summary: 'Barcha xabarlarni o\'qilgan deb belgilash',
    description: 'Foydalanuvchining barcha o\'qilmagan xabarlarini bir vaqtning o\'zida o\'qilgan holatga o\'tkazish.',
  })
  @ApiResponse({ status: 200, description: 'Barcha xabarlar o\'qildi' })
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
