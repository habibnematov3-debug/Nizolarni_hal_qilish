import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SendThreadMessageDto, StartMediatorThreadDto, UpdateApplicantProfileDto } from './dto/tal.dto';
import { RegisterBusinessAuthorityDocumentDto, UpdateBusinessOrganizationDto } from './dto/business.dto';
import { TalService } from './tal.service';

const CABINET_ROLES = ['CITIZEN', 'TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'REGIONAL_STAFF'];

@ApiTags('TAL — Talabgor kabineti')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinet')
export class TalController {
  constructor(private readonly tal: TalService) {}

  @Get('tal')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Kabinet bosh sahifasi, maqomga mos menyu va ariza/xabarlar xulosasi' })
  home(@CurrentUser() user: AuthUser) { return this.tal.home(user); }

  @Get('profile')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Joriy foydalanuvchining obyektivkasi' })
  profile(@CurrentUser() user: AuthUser) { return this.tal.getProfile(user); }

  @Patch('profile')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Joriy foydalanuvchining aloqa ma’lumotlarini tahrirlash' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateApplicantProfileDto) { return this.tal.updateProfile(user, dto); }

  @Get('business/organizations')
  @Roles('BUSINESS')
  @ApiOperation({ summary: 'E-IMZO STIR orqali bog‘langan yuridik shaxslar profili va vakolat hujjatlari' })
  businessOrganizations(@CurrentUser() user: AuthUser) { return this.tal.getBusinessOrganizations(user); }

  @Patch('business/organizations/:organizationId')
  @Roles('BUSINESS')
  @ApiOperation({ summary: 'Tashkilotning manzili, aloqa va bank rekvizitlarini yangilash' })
  updateBusinessOrganization(@CurrentUser() user: AuthUser, @Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() dto: UpdateBusinessOrganizationDto) {
    return this.tal.updateBusinessOrganization(user, organizationId, dto);
  }

  @Post('business/organizations/:organizationId/authority-documents')
  @Roles('BUSINESS')
  @ApiOperation({ summary: 'Ishonchnoma yoki tayinlov buyrug‘ini tashkilot profiliga biriktirish' })
  addBusinessAuthorityDocument(@CurrentUser() user: AuthUser, @Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() dto: RegisterBusinessAuthorityDocumentDto) {
    return this.tal.addBusinessAuthorityDocument(user, organizationId, dto);
  }

  @Get('training/course-info')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Mediatorlar uchun maxsus o‘quv kursi haqida e’lon qilingan ma’lumot' })
  courseInfo() { return this.tal.getCourseInfo(); }

  @Get('applications')
  @Roles('TALABGOR')
  @ApiOperation({ summary: 'Talabgorning mediator bo‘lish arizalari va imtihon natijalari' })
  applications(@CurrentUser() user: AuthUser) { return this.tal.getApplications(user); }

  @Get('threads')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Joriy foydalanuvchining mediator bilan chatlari va xabarlari' })
  threads(@CurrentUser() user: AuthUser) { return this.tal.listThreads(user); }

  @Post('threads')
  @Roles('TALABGOR')
  @ApiOperation({ summary: 'Reyestrdan faol mediator tanlab murojaat qilish va chat ochish' })
  startThread(@CurrentUser() user: AuthUser, @Body() dto: StartMediatorThreadDto) { return this.tal.startThread(user, dto); }

  @Post('threads/:id/messages')
  @Roles(...CABINET_ROLES)
  @ApiOperation({ summary: 'Chatga xabar yoki fayl biriktirib yuborish' })
  sendMessage(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SendThreadMessageDto) {
    return this.tal.sendMessage(user, id, dto);
  }
}
