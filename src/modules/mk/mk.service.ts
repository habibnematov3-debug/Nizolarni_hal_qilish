import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MkApplicationStatus, MkCommitteeRole, MkExamStatus, Prisma, RegistryStatus, CabinetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { LegalCapacityIntegrationAdapter } from '../integration/adapters/legal-capacity.adapter';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateCommitteeMemberDto, CreateMkApplicationDto, CreateQuestionDto, InviteToExamDto, QueryMkApplicationsDto, ReviewMkApplicationDto, SubmitScoreDto } from './dto/mk.dto';

@Injectable()
export class MkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly legalCapacity: LegalCapacityIntegrationAdapter,
  ) {}

  async createApplication(user: AuthUser, dto: CreateMkApplicationDto) {
    const active = await this.prisma.mkApplication.findFirst({ where: { applicantId: user.id, status: { notIn: [MkApplicationStatus.REJECTED, MkApplicationStatus.FAILED] } } });
    if (active) throw new ConflictException('Sizda faol MK arizasi mavjud');

    const check = user.pinfl ? await this.legalCapacity.checkStatus(user.pinfl) : null;
    const application = await this.prisma.mkApplication.create({
      data: {
        applicantId: user.id, phone: dto.phone, email: dto.email, address: dto.address, profession: dto.profession,
        diplomaFileId: dto.diplomaFileId, passportFileId: dto.passportFileId, courseCertificateId: dto.courseCertificateId,
        status: check?.status === 'IN_PROGRESS' ? MkApplicationStatus.SUBMITTED : MkApplicationStatus.CHECKING,
        autoCheckResult: check as unknown as Prisma.InputJsonValue,
        reviewDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const normalizedProfession = (dto.profession || '').toUpperCase();
    if (check?.status === 'APPROVED' && ['NOTARY', 'NOTARIUS', 'ADVOCATE', 'ADVOKAT'].includes(normalizedProfession)) {
      await this.registerApplicant(user, application.id, 'Tashqi maqom tasdiqlangani sababli imtihonsiz');
      return this.prisma.mkApplication.findUnique({ where: { id: application.id } });
    }
    return application;
  }

  async myApplications(user: AuthUser) { return this.prisma.mkApplication.findMany({ where: { applicantId: user.id }, include: { exams: true }, orderBy: { createdAt: 'desc' } }); }

  async getOwnApplication(user: AuthUser, id: string) {
    const item = await this.prisma.mkApplication.findFirst({ where: { id, applicantId: user.id }, include: { exams: { include: { scores: true } } } });
    if (!item) throw new NotFoundException('MK arizasi topilmadi');
    if (!item.statusSeen) await this.prisma.mkApplication.update({ where: { id }, data: { statusSeen: true } });
    return item;
  }

  async listApplications(query: QueryMkApplicationsDto) {
    const where: Prisma.MkApplicationWhereInput = {};
    if (query.status && Object.values(MkApplicationStatus).includes(query.status as MkApplicationStatus)) where.status = query.status as MkApplicationStatus;
    if (query.search) where.OR = [{ phone: { contains: query.search } }, { email: { contains: query.search, mode: 'insensitive' } }, { applicantId: query.search }];
    return this.prisma.mkApplication.findMany({ where, include: { exams: true }, orderBy: { submittedAt: 'desc' } });
  }

  private async getApplication(id: string) {
    const item = await this.prisma.mkApplication.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('MK arizasi topilmadi');
    return item;
  }

  async acceptApplication(user: AuthUser, id: string, ipAddress?: string) {
    const item = await this.getApplication(id);
    const reviewableStatuses: MkApplicationStatus[] = [MkApplicationStatus.SUBMITTED, MkApplicationStatus.CHECKING];
    if (!reviewableStatuses.includes(item.status)) throw new ConflictException('Ariza qabul qilish holatida emas');
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.ACCEPTED, reviewedById: user.id, reviewedAt: new Date(), rejectionReason: null } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'ACCEPT_MK_APPLICATION', entityType: 'MK_APPLICATION', entityId: id, ipAddress });
    await this.notify(item.applicantId, 'Arizangiz malaka komissiyasi tomonidan qabul qilindi.', `mk-${id}-accepted`);
    return updated;
  }

  async rejectApplication(user: AuthUser, id: string, dto: ReviewMkApplicationDto, ipAddress?: string) {
    if (!dto.rejectionReason) throw new BadRequestException('Rad etish sababi majburiy');
    const item = await this.getApplication(id);
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.REJECTED, rejectionReason: dto.rejectionReason, reviewedById: user.id, reviewedAt: new Date() } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'REJECT_MK_APPLICATION', entityType: 'MK_APPLICATION', entityId: id, newValues: { reason: dto.rejectionReason }, ipAddress });
    await this.notify(item.applicantId, `Arizangiz rad etildi: ${dto.rejectionReason}`, `mk-${id}-rejected`);
    return updated;
  }

  async inviteToExam(user: AuthUser, id: string, dto: InviteToExamDto) {
    const item = await this.getApplication(id);
    if (item.status !== MkApplicationStatus.ACCEPTED) throw new ConflictException('Faqat qabul qilingan ariza imtihonga chaqiriladi');
    const questions = await this.prisma.mkQuestion.findMany({ where: { isActive: true }, take: dto.questionCount || 20 });
    const selected = questions.sort(() => Math.random() - 0.5).map((question) => question.id);
    const exam = await this.prisma.mkExam.create({ data: { applicationId: id, scheduledAt: new Date(dto.scheduledAt), venue: dto.venue, secretaryPhone: dto.secretaryPhone, selectedQuestions: selected as unknown as Prisma.InputJsonValue } });
    await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.INVITED } });
    await this.notify(item.applicantId, `Imtihon sanasi: ${new Date(dto.scheduledAt).toLocaleString('uz-UZ')}. Joy: ${dto.venue}`, `mk-${id}-exam`);
    return exam;
  }

  async getOwnExam(user: AuthUser, id: string) {
    const exam = await this.prisma.mkExam.findUnique({ where: { id }, include: { application: true, assignments: true, scores: true } });
    if (!exam || exam.application.applicantId !== user.id) throw new NotFoundException('Imtihon topilmadi');
    const questionIds = Array.isArray(exam.selectedQuestions) ? exam.selectedQuestions as string[] : [];
    const questions = await this.prisma.mkQuestion.findMany({ where: { id: { in: questionIds } }, select: { id: true, text: true, options: true } });
    return { ...exam, questions };
  }

  async submitScore(user: AuthUser, examId: string, dto: SubmitScoreDto) {
    const member = await this.prisma.mkCommitteeMember.findFirst({ where: { userId: user.id, role: MkCommitteeRole.MEMBER, isActive: true } });
    if (!member) throw new ForbiddenException('Siz komissiya a\'zosi sifatida biriktirilmagansiz');
    const assignment = await this.prisma.mkExamAssignment.findUnique({ where: { examId_memberId: { examId, memberId: member.id } } });
    if (!assignment) throw new ForbiddenException('Siz ushbu imtihonga biriktirilmagansiz');
    const score = await this.prisma.mkExamScore.upsert({ where: { assignmentId: assignment.id }, create: { assignmentId: assignment.id, examId, score: dto.score, comment: dto.comment }, update: { score: dto.score, comment: dto.comment, submittedAt: new Date() } });
    await this.finalizeIfComplete(examId);
    return score;
  }

  private async finalizeIfComplete(examId: string) {
    const exam = await this.prisma.mkExam.findUnique({ where: { id: examId }, include: { application: true, assignments: { include: { score: true } } } });
    if (!exam || !exam.assignments.length || exam.assignments.some((item) => !item.score)) return;
    const average = exam.assignments.reduce((sum, item) => sum + Number(item.score!.score), 0) / exam.assignments.length;
    const passed = average >= 60;
    await this.prisma.mkExam.update({ where: { id: examId }, data: { status: MkExamStatus.COMPLETED } });
    await this.prisma.mkApplication.update({ where: { id: exam.applicationId }, data: { status: passed ? MkApplicationStatus.PASSED : MkApplicationStatus.FAILED } });
    if (passed) await this.registerApplicant({ id: exam.application.applicantId } as AuthUser, exam.applicationId, 'Imtihon natijasi asosida');
    await this.notify(exam.application.applicantId, passed ? 'Imtihon natijasi: o\'tdingiz.' : 'Imtihon natijasi: o\'ta olmadingiz.', `mk-${exam.applicationId}-result`);
  }

  private async registerApplicant(user: AuthUser, applicationId: string, reason: string) {
    await this.prisma.user.update({ where: { id: user.id }, data: { registryStatus: RegistryStatus.MEDIATOR, cabinetType: CabinetType.MEDIATOR } });
    await this.prisma.mediatorDossier.upsert({ where: { mediatorId: user.id }, create: { mediatorId: user.id, registeredYear: new Date().getFullYear(), region: user.region || '', specialization: [] }, update: { registryStatus: 'ACTIVE' } });
    await this.prisma.mkApplication.update({ where: { id: applicationId }, data: { status: MkApplicationStatus.REGISTERED } });
    await this.notify(user.id, 'Siz mediatorlar reyestriga kiritildingiz. Mediator kabineti ochildi.', `mk-${applicationId}-registered`);
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'REGISTER_MK_APPLICANT', entityType: 'MEDIATOR_REGISTRY', entityId: user.id, newValues: { reason } });
  }

  async createQuestion(user: AuthUser, dto: CreateQuestionDto) { return this.prisma.mkQuestion.create({ data: { text: dto.text, options: dto.options as unknown as Prisma.InputJsonValue, correctOption: dto.correctOption, createdById: user.id } }); }
  async listQuestions() { return this.prisma.mkQuestion.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }); }
  async createCommitteeMember(dto: CreateCommitteeMemberDto) {
    const member = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!member) throw new NotFoundException('Komissiya a\'zosi sifatida ko\'rsatilgan foydalanuvchi topilmadi');
    return this.prisma.mkCommitteeMember.upsert({ where: { userId_role: { userId: dto.userId, role: dto.role as any } }, create: { userId: dto.userId, role: dto.role as any }, update: { isActive: true } });
  }
  async assignCommitteeMember(examId: string, memberId: string) {
    const [exam, member] = await Promise.all([this.prisma.mkExam.findUnique({ where: { id: examId } }), this.prisma.mkCommitteeMember.findUnique({ where: { id: memberId } })]);
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    if (!member || !member.isActive) throw new NotFoundException('Komissiya a\'zosi topilmadi');
    return this.prisma.mkExamAssignment.upsert({ where: { examId_memberId: { examId, memberId } }, create: { examId, memberId }, update: {} });
  }

  private async notify(userId: string, content: string, key: string) {
    await this.notifications.send({ userId, templateCode: 'APPLICATION_STATUS', variables: { content, title: 'MK xabarnomasi' }, idempotencyKey: key, channels: ['CABINET', 'SMS'] as any });
  }
}
