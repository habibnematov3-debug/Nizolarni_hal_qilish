import { Controller, Get, Put, Post, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReturnReportDto } from './dto/return-report.dto';
import { ReportPeriodDto, OptionalReportPeriodDto } from './dto/report-period.dto';
import { ExportAnalyticsDto, ReportExportFormat } from './dto/export-analytics.dto';

@ApiTags('Hisobotlar va statistika (HIS)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('cabinet/reports')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Mediator hisobotlari ro\'yxati (HIS-02)' })
  getCabinetReports(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) { return this.reportsService.listCabinet(user, query); }

  @Get('cabinet/reports/current')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Joriy chorak hisoboti (HIS-01)' })
  getCurrent(@CurrentUser() user: AuthUser) { return this.reportsService.getCurrent(user); }

  @Put('cabinet/reports/:id')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiOperation({ summary: 'Hisobot statistik ma\'lumotlarini to\'ldirish' })
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.update(id, dto, user, req.ip, req.headers['user-agent']); }

  @Post('cabinet/reports/:id/submit')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Hisobotni hududiy organga yuborish (HIS-02)' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.submit(id, user, req.ip, req.headers['user-agent']); }

  @Get('staff/reports')
  @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hududiy hisobotlar ro\'yxati (HIS-03)' })
  getStaffReports(@CurrentUser() user: AuthUser, @Query() query: ReportsQueryDto) { return this.reportsService.listStaff(user, query); }

  @Get('staff/reports/:id')
  @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hisobot tafsiloti' })
  getStaffReport(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.reportsService.getStaffReport(id, user); }

  @Post('staff/reports/:id/return')
  @Roles('REGIONAL_STAFF')
  @ApiOperation({ summary: 'Hisobotni kamchilik sababi bilan qaytarish (HIS-03)' })
  returnReport(@Param('id') id: string, @Body() dto: ReturnReportDto, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.returnReport(id, dto.reason, user, req.ip, req.headers['user-agent']); }

  @Post('staff/reports/:id/accept')
  @Roles('REGIONAL_STAFF')
  @ApiOperation({ summary: 'Hisobotni qabul qilish (HIS-03)' })
  acceptReport(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.acceptReport(id, user, req.ip, req.headers['user-agent']); }

  @Post('staff/report-summaries')
  @Roles('REGIONAL_STAFF')
  @ApiOperation({ summary: 'Hududiy jamlanma yaratish' })
  createSummary(@Body() period: ReportPeriodDto, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.createSummary(period, user, req.ip, req.headers['user-agent']); }

  @Post('staff/report-summaries/:id/submit')
  @Roles('REGIONAL_STAFF')
  @ApiOperation({ summary: 'Jamlanmani Vazirlikka yuborish' })
  submitSummary(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) { return this.reportsService.submitSummary(id, user, req.ip, req.headers['user-agent']); }

  @Get('ministry/report-summaries')
  @Roles('MINISTRY_STAFF')
  @ApiOperation({ summary: 'Vazirlik jamlanmalari ro\'yxati (HIS-04)' })
  getSummaries(@Query() period: OptionalReportPeriodDto, @CurrentUser() user: AuthUser) { return this.reportsService.ministrySummaries(user, period); }

  @Get('ministry/analytics')
  @Roles('MINISTRY_STAFF')
  @ApiOperation({ summary: 'Respublika bo\'yicha tahlil (HIS-04/HIS-05)' })
  analytics(@Query() period: OptionalReportPeriodDto, @CurrentUser() user: AuthUser) { return this.reportsService.analytics(user, period); }

  @Get('ministry/analytics/export')
  @Roles('MINISTRY_STAFF')
  @ApiOperation({ summary: 'Tahlilni Excel yoki PDF formatida eksport qilish (HIS-05)' })
  @ApiQuery({ name: 'format', enum: ReportExportFormat, required: false })
  async export(@Query() query: ExportAnalyticsDto, @CurrentUser() user: AuthUser, @Res() response: Response) {
    const result = await this.reportsService.exportAnalytics(user, query.format || ReportExportFormat.EXCEL, query.year && query.quarter ? { year: query.year, quarter: query.quarter } : undefined);
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.send(result.buffer);
  }
}
