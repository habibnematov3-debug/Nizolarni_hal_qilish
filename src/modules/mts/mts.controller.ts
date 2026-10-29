import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MtsService } from './mts.service';
import { ConsentDto, CreateAgreementDto, CreateMediationDto, CreateMediationFeedbackDto, RecordResultDto, ScheduleSessionDto, SelectMediatorDto, SignAgreementDto } from './dto/mts.dto';

@ApiTags('Onlayn va majburiy mediatsiya (MTS)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinet/mts')
export class MtsController {
  constructor(private readonly service: MtsService) {}

  @Get('staff/monitoring') @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN') @ApiOperation({ summary: 'Hududiy yoki respublika miqyosidagi mediatsiya monitoringi' })
  staffMonitoring(@CurrentUser() user: AuthUser) { return this.service.staffMonitoring(user); }

  @Post('mediations') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS') @ApiOperation({ summary: 'Mediatsiyani boshlash' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMediationDto) { return this.service.create(user, dto); }

  @Get('mediations') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Mediatsiyalar ro\'yxati' })
  list(@CurrentUser() user: AuthUser) { return this.service.list(user); }

  @Get('mediations/:id') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Mediatsiya tafsiloti' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user, id); }

  @Post('mediations/:id/consent') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Taraf roziligini qayd etish' })
  consent(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ConsentDto) { return this.service.consent(user, id, dto); }

  @Post('mediations/:id/mediator') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS') @ApiOperation({ summary: 'Mediator tanlash' })
  selectMediator(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SelectMediatorDto) { return this.service.selectMediator(user, id, dto); }

  @Post('mediations/:id/agreement') @Roles('MEDIATOR') @ApiOperation({ summary: 'Mediatsiya kelishuvi loyihasini tayyorlash' })
  agreement(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateAgreementDto) { return this.service.createAgreement(user, id, dto); }

  @Post('mediations/:id/agreement/sign') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Mediatsiya kelishuvini imzolash' })
  sign(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SignAgreementDto) { return this.service.signAgreement(user, id, dto); }

  @Post('mediations/:id/sessions') @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Mediatsiya uchrashuvini belgilash' })
  session(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ScheduleSessionDto) { return this.service.scheduleSession(user, id, dto); }

  @Post('mediations/:id/sessions/:sessionId/join') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Uchrashuvga shaxsiy vaqtinchalik havola olish' })
  joinSession(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('sessionId') sessionId: string) { return this.service.joinSession(user, id, sessionId); }

  @Post('mediations/:id/result') @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR') @ApiOperation({ summary: 'Mediatsiya natijasini qayd etish' })
  result(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RecordResultDto) { return this.service.recordResult(user, id, dto); }

  @Post('mediations/:id/rating') @Roles('CITIZEN', 'TALABGOR', 'BUSINESS') @ApiOperation({ summary: 'Yakunlangan mediatsiya bo‘yicha mutaxassis faoliyatini baholash' })
  rate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateMediationFeedbackDto, @Req() req: Request) { return this.service.rate(user, id, dto, req.ip || req.socket.remoteAddress); }
}
