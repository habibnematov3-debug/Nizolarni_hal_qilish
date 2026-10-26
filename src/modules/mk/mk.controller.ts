import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MkService } from './mk.service';
import { AssignCommitteeMemberDto, CreateCommitteeMemberDto, CreateMkApplicationDto, CreateQuestionDto, InviteToExamDto, QueryMkApplicationsDto, ReviewMkApplicationDto, SubmitScoreDto } from './dto/mk.dto';

@ApiTags('Malaka komissiyasi va imtihon (MK)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MkController {
  constructor(private readonly service: MkService) {}

  @Post('cabinet/mk/applications') @Roles('TALABGOR') @ApiOperation({ summary: 'Mediator bo\'lish uchun ariza yuborish' })
  createApplication(@CurrentUser() user: AuthUser, @Body() dto: CreateMkApplicationDto) { return this.service.createApplication(user, dto); }

  @Get('cabinet/mk/applications') @Roles('TALABGOR') @ApiOperation({ summary: 'Talabgor arizalari' })
  myApplications(@CurrentUser() user: AuthUser) { return this.service.myApplications(user); }

  @Get('cabinet/mk/applications/:id') @Roles('TALABGOR') @ApiOperation({ summary: 'Ariza tafsiloti' })
  application(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getOwnApplication(user, id); }

  @Get('committee/mk/applications') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Komissiya arizalar jurnali' })
  committeeApplications(@Query() query: QueryMkApplicationsDto) { return this.service.listApplications(query); }

  @Post('committee/mk/applications/:id/accept') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Arizani qabul qilish' })
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: any) { return this.service.acceptApplication(user, id, req.ip); }

  @Post('committee/mk/applications/:id/reject') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Arizani rad etish' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewMkApplicationDto, @Req() req: any) { return this.service.rejectApplication(user, id, dto, req.ip); }

  @Post('committee/mk/applications/:id/invite') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Imtihonga chaqirish' })
  invite(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InviteToExamDto) { return this.service.inviteToExam(user, id, dto); }

  @Get('cabinet/mk/exams/:id') @Roles('TALABGOR') @ApiOperation({ summary: 'Talabgor imtihoni' })
  exam(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getOwnExam(user, id); }

  @Get('committee/mk/exams') @Roles('COMMISSION') @ApiOperation({ summary: 'Komissiya a’zosiga biriktirilgan imtihonlar' })
  assignedExams(@CurrentUser() user: AuthUser) { return this.service.listAssignedExams(user); }

  @Get('cabinet/mk/exams/:id/protocol') @Roles('TALABGOR') @ApiOperation({ summary: 'Imtihon bayonnomasini yuklab olish' })
  async applicantProtocol(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const pdf = await this.service.downloadProtocol(user, id);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="imtihon-bayonnomasi-${id}.pdf"` });
    return response.send(pdf);
  }

  @Get('committee/mk/exams/:id/protocol') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN') @ApiOperation({ summary: 'Komissiya uchun imtihon bayonnomasi' })
  async committeeProtocol(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const pdf = await this.service.downloadProtocol(user, id);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="imtihon-bayonnomasi-${id}.pdf"` });
    return response.send(pdf);
  }

  @Post('committee/mk/exams/:id/score') @Roles('COMMISSION') @ApiOperation({ summary: 'Elektron byulleten bahosi' })
  score(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitScoreDto) { return this.service.submitScore(user, id, dto); }

  @Post('admin/mk/questions') @Roles('ADMIN', 'COMMISSION') @ApiOperation({ summary: 'Savollar bankiga savol qo\'shish' })
  createQuestion(@CurrentUser() user: AuthUser, @Body() dto: CreateQuestionDto) { return this.service.createQuestion(user, dto); }

  @Get('admin/mk/questions') @Roles('ADMIN', 'COMMISSION') @ApiOperation({ summary: 'Savollar banki' })
  questions() { return this.service.listQuestions(); }

  @Post('admin/mk/committee-members') @Roles('ADMIN') @ApiOperation({ summary: 'Komissiya a\'zosini ro\'yxatga olish' })
  createMember(@Body() dto: CreateCommitteeMemberDto) { return this.service.createCommitteeMember(dto); }

  @Post('admin/mk/exams/:id/members') @Roles('ADMIN', 'COMMISSION') @ApiOperation({ summary: 'A\'zoni imtihonga biriktirish' })
  assignMember(@Param('id') examId: string, @Body() dto: AssignCommitteeMemberDto) { return this.service.assignCommitteeMember(examId, dto.memberId); }
}
