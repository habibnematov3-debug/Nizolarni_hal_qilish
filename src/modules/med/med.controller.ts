import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MedService } from './med.service';
import { CertificateReplacementDto, CreateCalendarEventDto, RegistryRemovalDto, SendMessageDto, UpdatePortfolioDto } from './dto/med.dto';

@ApiTags('Mediator kabineti (MED)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinet/med')
@Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
export class MedController {
  constructor(private readonly service: MedService) {}

  @Get('portfolio') @ApiOperation({ summary: 'Portfolio va obyektivka' })
  portfolio(@CurrentUser() user: AuthUser) { return this.service.getPortfolio(user); }

  @Patch('portfolio') @ApiOperation({ summary: 'Portfolio ma\'lumotlarini yangilash' })
  updatePortfolio(@CurrentUser() user: AuthUser, @Body() dto: UpdatePortfolioDto) { return this.service.updatePortfolio(user, dto); }

  @Get('calendar') @ApiOperation({ summary: 'Kalendar tadbirlari' })
  calendar(@CurrentUser() user: AuthUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.listEvents(user, from, to); }

  @Post('calendar') @ApiOperation({ summary: 'Kalendar tadbirini yaratish' })
  createEvent(@CurrentUser() user: AuthUser, @Body() dto: CreateCalendarEventDto) { return this.service.createEvent(user, dto); }

  @Delete('calendar/:id') @ApiOperation({ summary: 'Kalendar tadbirini bekor qilish' })
  deleteEvent(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.deleteEvent(user, id); }

  @Get('applications') @ApiOperation({ summary: 'MED arizalari' })
  applications(@CurrentUser() user: AuthUser) { return this.service.listApplications(user); }

  @Post('applications/registry-removal') @ApiOperation({ summary: 'Reyestrdan chiqarish arizasi' })
  registryRemoval(@CurrentUser() user: AuthUser, @Body() dto: RegistryRemovalDto, @Req() req: any) { return this.service.createRegistryRemoval(user, dto, req.ip); }

  @Post('applications/certificate-replacement') @ApiOperation({ summary: 'Guvohnomani almashtirish arizasi' })
  certificateReplacement(@CurrentUser() user: AuthUser, @Body() dto: CertificateReplacementDto, @Req() req: any) { return this.service.createCertificateReplacement(user, dto, req.ip); }

  @Get('messages') @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'TALABGOR') @ApiOperation({ summary: 'Yozishmalar' })
  messages(@CurrentUser() user: AuthUser) { return this.service.listMessages(user); }

  @Post('messages') @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'TALABGOR') @ApiOperation({ summary: 'Yozishma yuborish' })
  sendMessage(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) { return this.service.sendMessage(user, dto); }
}
