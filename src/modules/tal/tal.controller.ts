import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SendThreadMessageDto, StartMediatorThreadDto, UpdateApplicantProfileDto } from './dto/tal.dto';
import { TalService } from './tal.service';

const CABINET_ROLES = ['TALABGOR', 'BUSINESS', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'REGIONAL_STAFF'];

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
