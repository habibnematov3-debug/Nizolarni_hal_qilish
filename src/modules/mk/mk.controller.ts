import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { MkService } from './mk.service';
import { AssignCommitteeMemberDto, CreateCommitteeMemberDto, CreateMkApplicationDto, CreateQuestionDto, CreateTrainingCourseDto, InviteToExamDto, MarkTrainingAttendanceDto, QueryMkApplicationsDto, RegisterMkApplicantDto, RequestMkCorrectionDto, ResubmitMkApplicationDto, ReviewMkApplicationDto, SubmitScoreDto } from './dto/mk.dto';

@ApiTags('Malaka komissiyasi va imtihon (MK)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MkController {
  constructor(private readonly service: MkService) {}

  @Get('cabinet/mk/training-courses') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Ochiq malaka kurslari va vebinarlar' })
  trainingCourses(@CurrentUser() user: AuthUser) { return this.service.listTrainingCourses(user); }

  @Post('cabinet/mk/training-courses/:id/enroll') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Malaka kursi yoki vebinariga yozilish' })
  enrollTrainingCourse(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.enrollTrainingCourse(user, id); }

  @Get('committee/mk/training-courses') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Kurslar va yozilgan nomzodlar' })
  committeeTrainingCourses() { return this.service.listCommitteeTrainingCourses(); }

  @Post('committee/mk/training-courses') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Kurs yoki vebinar yaratish va e’lon qilish' })
  createTrainingCourse(@CurrentUser() user: AuthUser, @Body() dto: CreateTrainingCourseDto) { return this.service.createTrainingCourse(user, dto); }

  @Patch('committee/mk/training-enrollments/:id/attendance') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Nomzod davomatini komissiya tomonidan qayd etish' })
  markTrainingAttendance(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MarkTrainingAttendanceDto, @Req() req: any) { return this.service.markTrainingAttendance(user, id, dto, req.ip); }

  @Post('cabinet/mk/applications') @Roles('CITIZEN', 'TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Mediator bo\'lish uchun ariza yuborish' })
  createApplication(@CurrentUser() user: AuthUser, @Body() dto: CreateMkApplicationDto) { return this.service.createApplication(user, dto); }

  @Get('cabinet/mk/applications') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Talabgor arizalari' })
  myApplications(@CurrentUser() user: AuthUser) { return this.service.myApplications(user); }

  @Get('cabinet/mk/applications/:id') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Ariza tafsiloti' })
  application(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getOwnApplication(user, id); }

  @Patch('cabinet/mk/applications/:id/corrections') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Kamchiliklari tuzatilgan arizani qayta yuborish' })
  resubmit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ResubmitMkApplicationDto) { return this.service.resubmitApplication(user, id, dto); }

  @Get('committee/mk/applications') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Komissiya arizalar jurnali' })
  committeeApplications(@CurrentUser() user: AuthUser, @Query() query: QueryMkApplicationsDto) { return this.service.listApplications(query, user); }

  @Post('regional/mk/applications/:id/corrections') @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Arizachiga kamchiliklarni tuzatish uchun 5 ish kuni berish' })
  requestCorrection(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RequestMkCorrectionDto, @Req() req: any) { return this.service.requestCorrection(user, id, dto, req.ip); }

  @Post('regional/mk/applications/:id/forward') @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Arizani hududiy malaka komissiyasiga yuborish' })
  forward(@CurrentUser() user: AuthUser, @Param('id') id: string, @Req() req: any) { return this.service.forwardApplication(user, id, req.ip); }

  @Post('committee/mk/applications/:id/reject') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Arizani rad etish' })
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewMkApplicationDto, @Req() req: any) { return this.service.rejectApplication(user, id, dto, req.ip); }

  @Post('regional/mk/applications/:id/register') @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN') @ApiOperation({ summary: 'Talabgorni Mediatorlar reyestriga kiritish' })
  register(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RegisterMkApplicantDto, @Req() req: any) { return this.service.registerApplicant(user, id, dto, req.ip); }

  @Post('committee/mk/applications/:id/invite') @Roles('COMMISSION') @ApiOperation({ summary: 'Malaka imtihonini tayinlash (davlat xizmati bepul)' })
  invite(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InviteToExamDto) { return this.service.inviteToExam(user, id, dto); }

  @Get('cabinet/mk/exams/:id') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Talabgor imtihoni' })
  exam(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getOwnExam(user, id); }

  @Get('committee/mk/exams') @Roles('COMMISSION') @ApiOperation({ summary: 'Komissiya a’zosiga biriktirilgan imtihonlar' })
  assignedExams(@CurrentUser() user: AuthUser) { return this.service.listAssignedExams(user); }

  @Get('cabinet/mk/exams/:id/protocol') @Roles('TALABGOR', 'MEDIATOR_APPLICANT') @ApiOperation({ summary: 'Imtihon bayonnomasini yuklab olish' })
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
