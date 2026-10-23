import { Controller, Get, Param, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { TolService } from './tol.service';
import { CreatePaymentDto, PaymentQueryDto } from './dto/tol.dto';

@ApiTags('To\'lovlar (TOL)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TolController {
  constructor(private readonly service: TolService) {}

  @Post('cabinet/tol/payments') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Billing orqali to\'lov invoysi yaratish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) { return this.service.createPayment(user, dto); }

  @Get('cabinet/tol/payments') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Foydalanuvchi to\'lovlar tarixi' })
  history(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto) { return this.service.history(user, query); }

  @Get('cabinet/tol/payments/:invoiceNumber') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Invoys tafsiloti' })
  detail(@CurrentUser() user: AuthUser, @Param('invoiceNumber') invoiceNumber: string) { return this.service.detail(user, invoiceNumber); }

  @Get('admin/tol/payments/report') @Roles('ADMIN', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'To\'lovlar hisoboti' })
  async report(@CurrentUser() user: AuthUser, @Query() query: PaymentQueryDto, @Query('format') format: 'json' | 'csv' = 'json', @Res() response: Response) {
    const result = await this.service.report(user, query, format);
    response.setHeader('Content-Type', result.contentType);
    if (result.filename) response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.send(result.body);
  }
}
