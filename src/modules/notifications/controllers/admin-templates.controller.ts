import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationTemplatesService } from '../services/notification-templates.service';
import { UpdateNotificationTemplateDto } from '../dto/update-template.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Xabar shablonlari boshqaruvi (Notification Templates)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notification-templates')
export class AdminTemplatesController {
  constructor(private readonly templatesService: NotificationTemplatesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Barcha xabar shablonlari ro\'yxatini olish (FT-BIL-02 / BIL-02)',
    description: 'Ariza holati, imtihonga taklif, imtihon natijasi, shartnoma holati, hisobot topshirish, malaka oshirish, majburiyat bajarish va kalendar shablonlari.',
  })
  @ApiResponse({ status: 200, description: 'Shablonlar ro\'yxati' })
  async getAllTemplates() {
    return this.templatesService.getAllTemplates();
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Shablon tafsilotini olish',
    description: 'ID yoki kod bo\'yicha bitta xabar shablonini olish.',
  })
  @ApiParam({ name: 'id', description: 'Shablon ID si yoki kodi' })
  @ApiResponse({ status: 200, description: 'Shablon tafsiloti' })
  async getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplateById(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Xabar shablonini yangilash (FT-BIL-03 / BIL-02)',
    description: 'Xabar matnlari, SMS matni yoki o\'zgaruvchilarni tahrirlash. Amal to\'liq Audit jurnaliga yoziladi.',
  })
  @ApiParam({ name: 'id', description: 'Shablon ID si yoki kodi' })
  @ApiResponse({ status: 200, description: 'Shablon muvaffaqiyatli yangilandi' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.templatesService.updateTemplate(id, dto, user, ipAddress, userAgent);
  }
}
