import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tizim sozlamalari (System Settings)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tizim sozlamalarini olish',
    description: 'Taymer muddatlari, fayl cheklovlari, xabar shablonlari va umumiy tizim sozlamalarini olish.',
  })
  @ApiResponse({ status: 200, description: 'Tizim sozlamalari' })
  async getSettings() {
    return this.settingsService.getAllSettings();
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tizim sozlamalarini yangilash / saqlash',
    description: 'Taymer muddatlari va fayl cheklovlarini o\'zgartirish. Ushbu amal audit jurnaliga to\'liq yoziladi.',
  })
  @ApiResponse({ status: 200, description: 'Sozlamalar yangilandi' })
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.settingsService.updateSettings(dto, user, ipAddress, userAgent);
  }
}
