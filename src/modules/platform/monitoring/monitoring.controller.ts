import {
  Controller,
  Get,
  Query,
  Put,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { HealthStatusDto, MetricsDto, LogsResponseDto } from './health.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../../common/decorators/current-user.decorator';
import { AuditService } from '../../audit/audit.service';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceService } from './maintenance.service';

/**
 * Platform Monitoring Controller
 * Tizim holati, metrikalar va loglarni boshqarish
 */
@ApiTags('Platform — Monitoring')
@Controller('platform')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly maintenanceService: MaintenanceService,
    private readonly auditService: AuditService,
  ) {}

  @Get('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xizmat rejimini ko‘rish' })
  async getMaintenance() {
    return this.maintenanceService.getState();
  }

  @Put('maintenance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Texnik xizmat rejimini yoqish yoki o‘chirish' })
  async updateMaintenance(
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const oldState = await this.maintenanceService.getState();
    const nextState = await this.maintenanceService.update(dto.enabled, dto.message || '', user.username);
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'PLATFORM_MODE_CHANGE',
      entityType: 'PLATFORM',
      entityId: 'maintenance',
      oldValues: oldState,
      newValues: nextState,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    return nextState;
  }

  /**
   * Tizim salomatligi holati
   * JWT autentifikatsiya talab qilinmaydi (public endpoint)
   */
  @Get('health')
  @ApiOperation({
    summary: 'Tizim salomatligi holati',
    description:
      'API, ma\'lumotlar bazasi va scheduler holatini tekshiradi. ' +
      'Bu endpoint public — autentifikatsiya kerak emas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tizim holati muvaffaqiyatli qaytarildi',
    type: HealthStatusDto,
  })
  async getHealth(): Promise<HealthStatusDto> {
    return this.monitoringService.getHealthStatus();
  }

  /**
   * Tizim ko'rsatkichlari (metrikalar)
   * JWT + Admin roli talab qilinadi
   */
  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tizim ko\'rsatkichlari',
    description:
      'So\'rovlar soni, javob vaqti, xotira va CPU ishlatilishini ko\'rsatadi. ' +
      'Faqat Admin va Vazirlik xodimlariga ruxsat berilgan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrikalar muvaffaqiyatli qaytarildi',
    type: MetricsDto,
  })
  @ApiResponse({ status: 401, description: 'Avtorizatsiya kerak' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q — Admin roli kerak' })
  async getMetrics(): Promise<MetricsDto> {
    return this.monitoringService.getMetrics();
  }

  /**
   * Tizim loglari
   * JWT + Admin roli talab qilinadi
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tizim loglari ro\'yxati',
    description: 'Tizim loglarini sahifalab ko\'rsatadi. Admin roli kerak.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Loglar muvaffaqiyatli qaytarildi',
    type: LogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Avtorizatsiya kerak' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q — Admin roli kerak' })
  async getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<LogsResponseDto> {
    const { logs, total } = await this.monitoringService.getLogs(page, limit);
    return { logs, total, page, limit };
  }
}
