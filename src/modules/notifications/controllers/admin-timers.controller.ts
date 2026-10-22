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
import { TimersService } from '../services/timers.service';
import { UpdateTimerDto } from '../dto/update-timer.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Markaziy taymerlar boshqaruvi (Timers & Scheduler)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/timers')
export class AdminTimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Barcha taymer sozlamalarini olish (FT-BIL-05 / BIL-03)',
    description: 'Barcha modullarga tegishli (ariza ko\'rib chiqish, mediator tayinlash, malaka oshirish, hisobot topshirish va h.k.) markaziy muddat sozlamalari.',
  })
  @ApiResponse({ status: 200, description: 'Taymer sozlamalari ro\'yxati' })
  async getAllTimers() {
    return this.timersService.getAllTimers();
  }

  @Get(':key')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Bitta taymer tafsilotini olish',
    description: 'Kalit (key) bo\'yicha taymer muddatini ko\'rish.',
  })
  @ApiParam({ name: 'key', example: 'CASE_REGISTRATION_TIMEOUT' })
  @ApiResponse({ status: 200, description: 'Taymer ma\'lumotlari' })
  async getTimer(@Param('key') key: string) {
    return this.timersService.getTimerByKey(key);
  }

  @Put(':key')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Taymer muddatini o\'zgartirish (FT-BIL-05 / BIL-03)',
    description: 'Administrator tomonidan taymer muddati qiymati (kun, soat, oy)ni yangilash. O\'zgarish Audit jurnaliga yoziladi.',
  })
  @ApiParam({ name: 'key', example: 'CASE_REGISTRATION_TIMEOUT' })
  @ApiResponse({ status: 200, description: 'Taymer muddati yangilandi' })
  async updateTimer(
    @Param('key') key: string,
    @Body() dto: UpdateTimerDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.timersService.updateTimer(key, dto, user, ipAddress, userAgent);
  }
}
