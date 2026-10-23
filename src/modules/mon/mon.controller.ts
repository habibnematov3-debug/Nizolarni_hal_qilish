import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MonService } from './mon.service';
import { CreateObligationDto, ObligationQueryDto } from './dto/mon.dto';

@ApiTags('Majburiyatlar monitoringi (MON)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MonController {
  constructor(private readonly service: MonService) {}

  @Post('cabinet/monitoring/obligations') @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Kelishuv majburiyatini qayd etish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateObligationDto, @Req() req: any) { return this.service.create(user, dto, req.ip); }

  @Get('cabinet/monitoring/obligations') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Majburiyatlar ro\'yxati' })
  list(@CurrentUser() user: AuthUser, @Query() query: ObligationQueryDto) { return this.service.list(user, query); }

  @Patch('cabinet/monitoring/obligations/:id/complete') @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Majburiyatni bajarilgan deb belgilash' })
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: any) { return this.service.complete(user, id, req.ip); }

  @Get('ministry/monitoring/statistics') @Roles('MINISTRY_STAFF', 'REGIONAL_STAFF', 'ADMIN') @ApiOperation({ summary: 'Ijro statistikasi' })
  statistics(@CurrentUser() user: AuthUser, @Query() query: ObligationQueryDto) { return this.service.statistics(user, query); }

  @Post('admin/monitoring/reminders/run') @Roles('ADMIN') @ApiOperation({ summary: 'Majburiyat eslatmalari siklini ishga tushirish' })
  runReminders() { return this.service.runReminderCycle(); }
}
