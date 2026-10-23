import { Controller, Get, Param, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { TolService } from './tol.service';
import { CreateExamFeeDto, CreatePaymentDto, PaymentQueryDto } from './dto/tol.dto';

@ApiTags('To\'lovlar (TOL)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TolController {
  constructor(private readonly service: TolService) {}

  @Post('payments/exam-fee')
  @Roles('TALABGOR')
  @ApiOperation({ summary: 'Qabul qilingan ariza bo‘yicha malaka imtihoni to‘lovini boshlash' })
  createExamFee(@CurrentUser() user: AuthUser, @Body() dto: CreateExamFeeDto) { return this.service.createExamFee(user, dto); }

  @Get('payments')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Joriy foydalanuvchining to‘lovlar tarixi' })
  listPayments(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto) { return this.service.history(user, query); }

  @Get('payments/:id')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'ADMIN')
  @ApiOperation({ summary: 'To‘lov holati va invoys tafsiloti' })
  paymentDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.detail(user, id); }

  @Post('payments/:id/reconcile')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'ADMIN')
  @ApiOperation({ summary: 'To‘lov holatini billing provayderidan qayta tekshirish' })
  reconcile(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.reconcile(user, id); }

  @Post('cabinet/tol/payments') @Roles('ADMIN') @ApiOperation({ summary: 'Administrator uchun maxsus billing invoysi yaratish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) { return this.service.createPayment(user, dto); }

  @Get('cabinet/tol/payments') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Foydalanuvchi to\'lovlar tarixi' })
  history(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto) { return this.service.history(user, query); }

  @Get('cabinet/tol/payments/:invoiceNumber') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Invoys tafsiloti' })
  detail(@CurrentUser() user: AuthUser, @Param('invoiceNumber') invoiceNumber: string) { return this.service.detail(user, invoiceNumber); }

  @Get('admin/tol/payments/report') @Roles('ADMIN', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'To\'lovlar hisoboti' })
  async report(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto, @Query('format') format: 'json' | 'csv' = 'json', @Res() response: Response) {
    return this.sendReport(user, query, format, response);
  }

  @Get('staff/payments/report')
  @Roles('ADMIN', 'REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hududiy yoki vazirlik to‘lovlari hisoboti va CSV eksporti' })
  async staffReport(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto, @Query('format') format: 'json' | 'csv' = 'json', @Res() response: Response) {
    return this.sendReport(user, query, format, response);
  }

  private async sendReport(user: AuthUser, query: PaymentQueryDto, format: 'json' | 'csv', response: Response) {
    const result = await this.service.report(user, query, format);
    response.setHeader('Content-Type', result.contentType);
    if (result.filename) response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return response.send(result.body);
  }
}
