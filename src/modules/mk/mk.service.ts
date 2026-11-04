import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MkApplicationStatus, MkCommitteeRole, MkExamStatus, Prisma, RegistryStatus, CabinetType, RegistryEntryStatus, RegistryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { LegalCapacityIntegrationAdapter } from '../integration/adapters/legal-capacity.adapter';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import PDFDocument from 'pdfkit';
import { FileAccessLevel } from '../platform/files/dto/file-upload.dto';
import { FileStorageService } from '../platform/files/file-storage.service';
import { randomInt } from 'crypto';
import { normalizeWorkExperience, validateCalendarDate } from './questionnaire';
import { CreateCommitteeMemberDto, CreateMkApplicationDto, CreateQuestionDto, CreateTrainingCourseDto, InviteToExamDto, MarkTrainingAttendanceDto, QueryMkApplicationsDto, RegisterMkApplicantDto, RequestMkCorrectionDto, ResubmitMkApplicationDto, ReviewMkApplicationDto, SubmitScoreDto } from './dto/mk.dto';

@Injectable()
export class MkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly legalCapacity: LegalCapacityIntegrationAdapter,
    private readonly files: FileStorageService,
  ) {}

  async listTrainingCourses(user: AuthUser) {
    const courses = await this.prisma.trainingCourse.findMany({
      where: { isPublished: true },
      include: { enrollments: { where: { userId: user.id }, select: { id: true, enrolledAt: true, attendedAt: true, completedAt: true } }, _count: { select: { enrollments: true } } },
      orderBy: [{ createdAt: 'desc' }],
    });
    return courses.map(({ enrollments, ...course }) => ({ ...course, enrollment: enrollments[0] || null, enrollmentCount: course._count.enrollments }));
  }

  async enrollTrainingCourse(user: AuthUser, courseId: string) {
    const course = await this.prisma.trainingCourse.findFirst({ where: { id: courseId, isPublished: true }, select: { id: true } });
    if (!course) throw new NotFoundException('E’lon qilingan kurs topilmadi');
    return this.prisma.trainingEnrollment.upsert({
      where: { courseId_userId: { courseId, userId: user.id } },
      create: { courseId, userId: user.id },
      update: {},
      select: { id: true, courseId: true, enrolledAt: true, attendedAt: true, completedAt: true },
    });
  }

  async listCommitteeTrainingCourses() {
    const courses = await this.prisma.trainingCourse.findMany({
      include: { enrollments: { include: { user: { select: { id: true, fullName: true, pinfl: true } }, }, orderBy: { enrolledAt: 'asc' } }, _count: { select: { enrollments: true } } },
      orderBy: [{ createdAt: 'desc' }],
    });
    return courses.map((course) => ({ ...course, enrollmentCount: course._count.enrollments }));
  }

  async createTrainingCourse(user: AuthUser, dto: CreateTrainingCourseDto) {
    return this.prisma.trainingCourse.create({
      data: {
        title: dto.title.trim(), type: dto.type, durationHours: dto.durationHours,
        dateLabel: dto.dateLabel.trim(), description: dto.description.trim(),
        joinUrl: dto.joinUrl?.trim() || null, isPublished: true, createdById: user.id,
      },
    });
  }

  async markTrainingAttendance(user: AuthUser, enrollmentId: string, dto: MarkTrainingAttendanceDto, ipAddress?: string) {
    const enrollment = await this.prisma.trainingEnrollment.findUnique({ where: { id: enrollmentId }, select: { id: true, attendedAt: true, completedAt: true } });
    if (!enrollment) throw new NotFoundException('Kursga yozilish topilmadi');
    const attendedAt = dto.attended ? enrollment.attendedAt || new Date() : null;
    const updated = await this.prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: { attendedAt, completedAt: dto.completed && dto.attended ? enrollment.completedAt || new Date() : dto.attended ? enrollment.completedAt : null, markedById: user.id },
      select: { id: true, courseId: true, enrolledAt: true, attendedAt: true, completedAt: true },
    });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'MARK_TRAINING_ATTENDANCE', entityType: 'TRAINING_ENROLLMENT', entityId: enrollmentId, newValues: { attended: dto.attended, completed: Boolean(dto.completed) }, ipAddress });
    return updated;
  }

  async createApplication(user: AuthUser, dto: CreateMkApplicationDto) {
    if (dto.education !== undefined && dto.education.trim().length < 2) throw new BadRequestException('Ma’lumoti va diplom yo‘nalishini kiriting');
    if (!dto.ethicsAccepted) throw new BadRequestException('Mediatsiya qonunchiligi va kasb etikasi bilan tanishganingizni tasdiqlang');
    if (!dto.region.trim()) throw new BadRequestException('Faoliyat hududini tanlang');
    if (!dto.address?.trim() || !dto.practiceAddress?.trim()) throw new BadRequestException('Yashash va faoliyat manzilini kiriting');
    if (!dto.passportIssuedBy?.trim()) throw new BadRequestException('Pasport yoki ID-kartani bergan organni kiriting');
    if (!dto.specialization.some((value) => value.trim()) || !dto.languages.some((value) => value.trim())) throw new BadRequestException('Ixtisoslashuv va mediatsiya tilini tanlang');
    const active = await this.prisma.mkApplication.findFirst({ where: { applicantId: user.id, status: { notIn: [MkApplicationStatus.REJECTED, MkApplicationStatus.FAILED] } } });
    if (active) throw new ConflictException('Sizda faol MK arizasi mavjud');
    const profession = dto.profession.toUpperCase();
    const specialProfession = ['NOTARY', 'ADVOCATE'].includes(profession);
    if (!specialProfession) {
      const lastFailed = await this.prisma.mkApplication.findFirst({ where: { applicantId: user.id, status: MkApplicationStatus.FAILED, examFailedAt: { not: null } }, orderBy: { examFailedAt: 'desc' }, select: { examFailedAt: true } });
      if (lastFailed?.examFailedAt) {
        const retryAt = this.addCalendarMonths(lastFailed.examFailedAt, 3);
        if (retryAt > new Date()) throw new ConflictException(`Malaka imtihonidan keyin qayta murojaat ${retryAt.toLocaleDateString('uz-UZ')} sanasidan boshlab mumkin`);
      }
    }
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, fullName: true, pinfl: true, phone: true, email: true, address: true, passportSeriesNumber: true, passportGivenDate: true, passportExpireDate: true, birthDate: true, birthPlace: true, nationality: true, gender: true },
    });
    if (!profile?.pinfl || !/^\d{14}$/.test(profile.pinfl) || !profile.fullName?.trim() || !profile.passportSeriesNumber || !profile.passportGivenDate) {
      throw new BadRequestException('Ariza uchun OneID profilidagi PINFL va to‘liq pasport ma’lumotlari zarur');
    }
    const birthDate = profile.birthDate?.slice(0, 10) || dto.birthDate;
    validateCalendarDate(birthDate || '', 'Tug‘ilgan sana');
    validateCalendarDate(profile.passportGivenDate.slice(0, 10), 'Pasport berilgan sana');
    if (profile.passportGivenDate.slice(0, 10) < birthDate) throw new BadRequestException('Pasport berilgan sana tug‘ilgan sanadan oldin bo‘lishi mumkin emas');
    const workExperience = normalizeWorkExperience(dto.workExperience, birthDate);
    if (!profile.phone || this.normalizePhone(profile.phone) !== this.normalizePhone(dto.phone)) {
      throw new BadRequestException('Telefon raqamini avval shaxsiy profilda yangilang va tasdiqlang');
    }
    const requiredFileIds = [dto.diplomaFileId, dto.passportFileId, dto.courseCertificateId, dto.professionProofFileId, dto.powerOfAttorneyFileId].filter((id): id is string => Boolean(id));
    // Annex 2 starred information is requested through interagency exchange.
    // A missing optional copy is pending evidence, never an automatic exemption.
    if (specialProfession && !dto.professionProofFileId) throw new BadRequestException('Notarius yoki advokat maqomini tasdiqlovchi hujjatni biriktiring');
    const ownedFiles = await this.prisma.fileRecord.findMany({
      where: { id: { in: requiredFileIds }, uploadedById: user.id, accessLevel: 'PRIVATE' },
      select: { id: true },
    });
    if (ownedFiles.length !== new Set(requiredFileIds).size) {
      throw new BadRequestException('Arizaga faqat o‘zingiz yuklagan shaxsiy hujjat fayllarini biriktiring');
    }

    const check = await this.legalCapacity.checkStatus(profile.pinfl);
    const passportData = {
      seriesNumber: profile.passportSeriesNumber,
      givenDate: profile.passportGivenDate,
      expireDate: profile.passportExpireDate,
      issuedBy: dto.passportIssuedBy.trim(),
      birthDate,
      birthPlace: profile.birthPlace,
      nationality: profile.nationality,
      gender: profile.gender,
      fullName: profile.fullName,
      pinfl: profile.pinfl,
      questionnaire: {
        version: 'regulation-140-annex-2',
        submissionMode: 'SELF',
        practiceAddress: dto.practiceAddress.trim(),
        sources: {
          identity: 'PROFILE',
          passportIssuedBy: 'APPLICANT',
          birthDate: profile.birthDate ? 'PROFILE' : 'APPLICANT',
          education: dto.education ? 'APPLICANT' : 'PENDING',
          workExperience: workExperience.length ? 'APPLICANT' : 'PENDING',
          courseCertificate: dto.courseCertificateId ? 'APPLICANT' : 'PENDING',
        },
      },
    };
    const application = await this.prisma.mkApplication.create({
      data: {
        applicantId: user.id, phone: profile.phone, email: dto.email?.trim().toLowerCase() || null, address: dto.address.trim(), region: dto.region.trim(), education: dto.education?.trim() || null, profession,
        specialization: dto.specialization.map((item) => item.trim()).filter(Boolean), languages: dto.languages.map((item) => item.trim()).filter(Boolean),
        workExperience: workExperience as Prisma.InputJsonValue, ethicsAcceptedAt: new Date(),
        diplomaFileId: dto.diplomaFileId, passportFileId: dto.passportFileId, courseCertificateId: dto.courseCertificateId, professionProofFileId: dto.professionProofFileId, powerOfAttorneyFileId: dto.powerOfAttorneyFileId,
        passportData: passportData as unknown as Prisma.InputJsonValue,
        status: check?.status === 'IN_PROGRESS' ? MkApplicationStatus.SUBMITTED : MkApplicationStatus.CHECKING,
        regionalReviewDeadline: this.addBusinessDays(new Date(), 10),
        autoCheckResult: check as unknown as Prisma.InputJsonValue,
      },
    });

    const applicantRole = await this.prisma.role.upsert({
      where: { name: 'MEDIATOR_APPLICANT' },
      update: {},
      create: {
        name: 'MEDIATOR_APPLICANT',
        displayName: 'Mediator talabgori',
        description: 'Mediator maqomiga ariza bergan va malaka jarayonidagi nomzod',
        isSystem: false,
      },
    });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: applicantRole.id } },
      update: {},
      create: { userId: user.id, roleId: applicantRole.id },
    });

    return application;
  }

  private normalizePhone(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('998') ? `+${digits}` : digits.length === 9 ? `+998${digits}` : `+${digits}`;
  }

  async myApplications(user: AuthUser) { return this.prisma.mkApplication.findMany({ where: { applicantId: user.id }, include: { exams: true }, orderBy: { createdAt: 'desc' } }); }

  async getOwnApplication(user: AuthUser, id: string) {
    const item = await this.prisma.mkApplication.findFirst({ where: { id, applicantId: user.id }, include: { exams: { include: { scores: true } } } });
    if (!item) throw new NotFoundException('MK arizasi topilmadi');
    if (!item.statusSeen) await this.prisma.mkApplication.update({ where: { id }, data: { statusSeen: true } });
    return item;
  }

  async listApplications(query: QueryMkApplicationsDto, actor: AuthUser) {
    const where: Prisma.MkApplicationWhereInput = {};
    if (query.status && Object.values(MkApplicationStatus).includes(query.status as MkApplicationStatus)) where.status = query.status as MkApplicationStatus;
    if (query.search) where.OR = [{ phone: { contains: query.search } }, { email: { contains: query.search, mode: 'insensitive' } }, { applicantId: query.search }];
    const regionalScope = this.staffRegion(actor);
    if (actor.roles.includes('REGIONAL_STAFF') || (actor.roles.includes('COMMISSION') && regionalScope)) {
      if (!regionalScope) return [];
      where.region = regionalScope;
    }
    return this.prisma.mkApplication.findMany({ where, include: { exams: true }, orderBy: { submittedAt: 'desc' } });
  }

  private async getApplication(id: string) {
    const item = await this.prisma.mkApplication.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('MK arizasi topilmadi');
    return item;
  }

  async requestCorrection(user: AuthUser, id: string, dto: RequestMkCorrectionDto, ipAddress?: string) {
    const item = await this.getApplication(id);
    this.assertRegionalScope(user, item.region);
    if (item.status !== MkApplicationStatus.SUBMITTED && item.status !== MkApplicationStatus.CHECKING) throw new ConflictException('Faqat hududiy tekshiruvdagi arizaga tuzatish so‘rash mumkin');
    const deadline = this.addBusinessDays(new Date(), 5);
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.CORRECTION_REQUESTED, correctionNote: dto.note.trim(), correctionDeadline: deadline, regionalReviewDeadline: null } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'REQUEST_MK_CORRECTION', entityType: 'MK_APPLICATION', entityId: id, newValues: { note: dto.note.trim(), deadline }, ipAddress });
    await this.notify(item.applicantId, `Arizadagi kamchiliklarni ${deadline.toLocaleDateString('uz-UZ')} gacha tuzating: ${dto.note.trim()}`, `mk-${id}-correction-${deadline.toISOString().slice(0, 10)}`);
    return updated;
  }

  async resubmitApplication(user: AuthUser, id: string, dto: ResubmitMkApplicationDto) {
    const item = await this.getApplication(id);
    if (item.applicantId !== user.id) throw new ForbiddenException('Bu arizani tahrirlash huquqi yo‘q');
    if (item.status !== MkApplicationStatus.CORRECTION_REQUESTED || !item.correctionDeadline) throw new ConflictException('Ariza tuzatish uchun qaytarilmagan');
    if (new Date() > item.correctionDeadline) {
      await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.REJECTED, rejectionCode: 'CORRECTIONS_NOT_FIXED', rejectionReason: 'Kamchiliklar belgilangan 5 ish kuni ichida bartaraf etilmadi.' } });
      throw new ConflictException('Kamchiliklarni tuzatish muddati tugagan');
    }
    if (dto.region !== undefined && dto.region.trim().toLocaleLowerCase() !== item.region.toLocaleLowerCase()) {
      throw new BadRequestException('Faoliyat hududini o‘zgartirish uchun hududiy adliya organiga murojaat qiling');
    }
    const patch: Prisma.MkApplicationUpdateInput = {
      correctionNote: null, correctionDeadline: null, rejectionCode: null, rejectionReason: null,
      status: MkApplicationStatus.SUBMITTED, regionalReviewDeadline: this.addBusinessDays(new Date(), 10),
    };
    if (dto.region !== undefined) patch.region = dto.region.trim();
    if (dto.address !== undefined) patch.address = dto.address;
    if (dto.education !== undefined) patch.education = dto.education.trim();
    if (dto.email !== undefined) patch.email = dto.email.trim().toLowerCase() || null;
    if (dto.specialization !== undefined) patch.specialization = dto.specialization.map((value) => value.trim()).filter(Boolean);
    if (dto.languages !== undefined) patch.languages = dto.languages.map((value) => value.trim()).filter(Boolean);
    const passport = (item.passportData || {}) as Record<string, any>;
    const questionnaire = passport.questionnaire || {};
    const birthDate = questionnaire.sources?.birthDate === 'PROFILE' ? passport.birthDate : dto.birthDate || passport.birthDate;
    if (dto.birthDate !== undefined) validateCalendarDate(birthDate || '', 'Tug‘ilgan sana');
    if (dto.workExperience !== undefined || dto.birthDate !== undefined) {
      patch.workExperience = normalizeWorkExperience(dto.workExperience ?? (item.workExperience as any[]) ?? [], birthDate) as Prisma.InputJsonValue;
    }
    patch.passportData = {
      ...passport,
      ...(dto.passportIssuedBy !== undefined ? { issuedBy: dto.passportIssuedBy.trim() } : {}),
      ...(birthDate ? { birthDate } : {}),
      questionnaire: {
        ...questionnaire,
        ...(dto.practiceAddress !== undefined ? { practiceAddress: dto.practiceAddress.trim() } : {}),
        sources: {
          ...questionnaire.sources,
          ...(dto.passportIssuedBy !== undefined ? { passportIssuedBy: 'APPLICANT' } : {}),
          ...(dto.birthDate !== undefined && questionnaire.sources?.birthDate !== 'PROFILE' ? { birthDate: 'APPLICANT' } : {}),
          ...(dto.education !== undefined ? { education: 'APPLICANT' } : {}),
          ...(dto.workExperience !== undefined ? { workExperience: dto.workExperience.length ? 'APPLICANT' : 'PENDING' } : {}),
        },
      },
    };
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: patch });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'RESUBMIT_MK_APPLICATION', entityType: 'MK_APPLICATION', entityId: id, newValues: { response: dto.correctionResponse } });
    await this.notify(user.id, 'Tuzatilgan arizangiz hududiy adliya organiga qayta yuborildi.', `mk-${id}-resubmitted-${updated.updatedAt.toISOString()}`);
    return updated;
  }

  async forwardApplication(user: AuthUser, id: string, ipAddress?: string) {
    const item = await this.getApplication(id);
    this.assertRegionalScope(user, item.region);
    if (item.status !== MkApplicationStatus.SUBMITTED && item.status !== MkApplicationStatus.CHECKING) throw new ConflictException('Ariza hududiy adliya organi tekshiruvida emas');
    const now = new Date();
    const isExamExempt = ['NOTARY', 'ADVOCATE'].includes((item.profession || '').toUpperCase());
    if (isExamExempt && !item.professionProofFileId) throw new BadRequestException('Advokat yoki notarius maqomi tasdiqlovchi hujjat topilmadi');
    const status = isExamExempt ? MkApplicationStatus.EXEMPT_PENDING_REGISTRATION : MkApplicationStatus.FORWARDED;
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: { status, forwardedAt: now, regionalReviewDeadline: null, reviewDeadline: isExamExempt ? null : this.addBusinessDays(now, 10) } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'FORWARD_MK_APPLICATION', entityType: 'MK_APPLICATION', entityId: id, newValues: { status, forwardedAt: now }, ipAddress });
    await this.notify(item.applicantId, isExamExempt ? 'Arizangiz imtihondan ozod etish asosida hududiy adliya organida reyestrga kiritish uchun ko‘rib chiqiladi.' : 'Arizangiz malaka imtihonini tayinlash uchun hududiy malaka komissiyasiga yuborildi.', `mk-${id}-forwarded`);
    return updated;
  }

  async rejectApplication(user: AuthUser, id: string, dto: ReviewMkApplicationDto, ipAddress?: string) {
    const item = await this.getApplication(id);
    this.assertRegionalScope(user, item.region);
    const allowedStatuses: MkApplicationStatus[] = [MkApplicationStatus.SUBMITTED, MkApplicationStatus.CHECKING, MkApplicationStatus.FORWARDED];
    if (!allowedStatuses.includes(item.status)) throw new ConflictException('Arizani ushbu bosqichda rad etib bo‘lmaydi');
    const reasonText = dto.rejectionReason?.trim() || this.rejectionLabel(dto.rejectionCode);
    const updated = await this.prisma.mkApplication.update({ where: { id }, data: { status: MkApplicationStatus.REJECTED, rejectionCode: dto.rejectionCode, rejectionReason: reasonText, regionalReviewDeadline: null, reviewedById: user.id, reviewedAt: new Date() } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'REJECT_MK_APPLICATION', entityType: 'MK_APPLICATION', entityId: id, newValues: { rejectionCode: dto.rejectionCode, reason: reasonText }, ipAddress });
    await this.notify(item.applicantId, `Arizangiz rad etildi: ${reasonText}`, `mk-${id}-rejected`);
    return updated;
  }

  async inviteToExam(user: AuthUser, id: string, dto: InviteToExamDto) {
    const item = await this.getApplication(id);
    this.assertRegionalScope(user, item.region);
    if (item.status !== MkApplicationStatus.FORWARDED && item.status !== MkApplicationStatus.ACCEPTED) throw new ConflictException('Imtihon faqat komissiyaga yuborilgan ariza bo‘yicha tayinlanadi');
    if (['NOTARY', 'ADVOCATE'].includes((item.profession || '').toUpperCase())) throw new ConflictException('Notarius va advokatlar malaka imtihonidan ozod');
    const completedCourse = await this.prisma.trainingEnrollment.findFirst({ where: { userId: item.applicantId, completedAt: { not: null }, course: { isPublished: true, type: 'COURSE' } }, select: { id: true } });
    if (!completedCourse) throw new ConflictException('Malaka imtihonini tayinlashdan oldin talabgor kamida bitta e’lon qilingan o‘quv kursini tugatgan bo‘lishi kerak');
    const forwardedAt = item.forwardedAt || item.reviewedAt || item.submittedAt;
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) throw new BadRequestException('Imtihon sanasi kelajakdagi vaqt bo‘lishi kerak');
    if (scheduledAt > this.addCalendarMonths(forwardedAt, 1)) throw new BadRequestException('Malaka imtihoni ariza komissiyaga yuborilganidan keyin bir oy ichida belgilanishi kerak');
    const questionPool = await this.prisma.mkQuestion.findMany({ where: { isActive: true }, select: { id: true } });
    const shuffled = [...questionPool];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    const selected = shuffled.slice(0, dto.questionCount || 20).map((question) => question.id);
    const exam = await this.prisma.mkExam.create({ data: { applicationId: id, scheduledAt, venue: dto.venue, secretaryPhone: dto.secretaryPhone, selectedQuestions: selected as unknown as Prisma.InputJsonValue, streamUrl: dto.streamUrl } });
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

  async listAssignedExams(user: AuthUser) {
    const member = await this.prisma.mkCommitteeMember.findFirst({ where: { userId: user.id, role: MkCommitteeRole.MEMBER, isActive: true } });
    if (!member) return [];
    return this.prisma.mkExam.findMany({
      where: { assignments: { some: { memberId: member.id } } },
      include: { application: true, assignments: { where: { memberId: member.id }, include: { score: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
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
    const exam = await this.prisma.mkExam.findUnique({ where: { id: examId }, include: { application: true, assignments: { include: { score: true, member: true } } } });
    if (!exam || exam.status === MkExamStatus.COMPLETED || !exam.assignments.length || exam.assignments.some((item) => !item.score)) return;
    const average = exam.assignments.reduce((sum, item) => sum + Number(item.score!.score), 0) / exam.assignments.length;
    const passed = average >= 60;
    const committeeUsers = await this.prisma.user.findMany({ where: { id: { in: exam.assignments.map((item) => item.member.userId) } }, select: { id: true, fullName: true } });
    const applicant = await this.prisma.user.findUnique({ where: { id: exam.application.applicantId }, select: { fullName: true } });
    const protocol = await this.createExamProtocol(exam, committeeUsers, applicant?.fullName || 'Talabgor', average, passed);
    const protocolFile = await this.files.upload({
      fieldname: 'file', originalname: `imtihon-bayonnomasi-${exam.id}.pdf`, encoding: '7bit',
      mimetype: 'application/pdf', size: protocol.length, buffer: protocol,
      destination: '', filename: '', path: '', stream: undefined as any,
    } as Express.Multer.File, exam.application.applicantId, FileAccessLevel.INTERNAL, 'Malaka imtihoni elektron bayonnomasi');
    await this.prisma.mkExam.update({ where: { id: examId }, data: { status: MkExamStatus.COMPLETED, protocolFileId: protocolFile.id } });
    const now = new Date();
    await this.prisma.mkApplication.update({ where: { id: exam.applicationId }, data: {
      status: passed ? MkApplicationStatus.PASSED : MkApplicationStatus.FAILED,
      examFailedAt: passed ? null : now,
      registryDeadline: passed ? this.addBusinessDays(now, 3) : null,
    } });
    await this.notify(exam.application.applicantId, passed ? 'Imtihon natijasi: o\'tdingiz.' : 'Imtihon natijasi: o\'ta olmadingiz.', `mk-${exam.applicationId}-result`);
  }

  async downloadProtocol(user: AuthUser, examId: string) {
    const exam = await this.prisma.mkExam.findUnique({ where: { id: examId }, include: { application: true, assignments: { include: { member: true } } } });
    if (!exam?.protocolFileId) throw new NotFoundException('Imtihon bayonnomasi hali tayyor emas');
    const isApplicant = exam.application.applicantId === user.id;
    const isAssignedMember = exam.assignments.some((assignment) => assignment.member.userId === user.id);
    const isStaff = user.roles.some((role) => ['ADMIN', 'REGIONAL_STAFF', 'MINISTRY_STAFF'].includes(role));
    if (!isApplicant && !isAssignedMember && !isStaff) throw new ForbiddenException('Bayonnomani ko‘rish vakolati yo‘q');
    return this.files.download(exam.protocolFileId, user.id);
  }

  private createExamProtocol(exam: any, committee: { id: string; fullName: string }[], applicantName: string, average: number, passed: boolean) {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('error', reject);
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(18).text('MALAKA IMTIHONI BAYONNOMASI', { align: 'center' });
      document.moveDown();
      document.fontSize(11).text(`Ariza raqami: ${exam.applicationId}`);
      document.text(`Talabgor: ${applicantName}`);
      document.text(`Imtihon sanasi: ${exam.scheduledAt.toLocaleString('uz-UZ')}`);
      document.text(`Manzil: ${exam.venue}`);
      document.text(`O‘rtacha baho: ${average.toFixed(2)}`);
      document.text(`Natija: ${passed ? 'O‘tdi' : 'O‘tmadi'}`);
      document.moveDown().fontSize(13).text('Komissiya baholari');
      document.moveDown(0.5).fontSize(10);
      for (const assignment of exam.assignments) {
        const member = committee.find((item) => item.id === assignment.member.userId);
        document.text(`${member?.fullName || assignment.member.userId}: ${Number(assignment.score.score).toFixed(2)}${assignment.score.comment ? ` — ${assignment.score.comment}` : ''}`);
      }
      document.moveDown().fontSize(9).text(`Tizimda shakllantirilgan: ${new Date().toLocaleString('uz-UZ')}`);
      document.end();
    });
  }

  async registerApplicant(actor: AuthUser, applicationId: string, dto: RegisterMkApplicantDto, ipAddress?: string) {
    const application = await this.getApplication(applicationId);
    this.assertRegionalScope(actor, application.region);
    const isExamExempt = ['NOTARY', 'ADVOCATE'].includes((application.profession || '').toUpperCase());
    if (application.status !== MkApplicationStatus.PASSED && application.status !== MkApplicationStatus.EXEMPT_PENDING_REGISTRATION) {
      throw new ConflictException('Reyestrga faqat imtihondan o‘tgan yoki imtihondan ozod qilingan ariza kiritiladi');
    }
    if (isExamExempt && !application.professionProofFileId) throw new BadRequestException('Advokat yoki notarius maqomini tasdiqlovchi hujjat topilmadi');
    const person = await this.prisma.user.findUnique({ where: { id: application.applicantId } });
    if (!person) throw new NotFoundException('Talabgor profili topilmadi');
    if (!dto.registryNumber.trim()) throw new BadRequestException('Mediator reyestridagi rasmiy tartib raqamini kiriting');
    const questionnairePassport = application.passportData as Record<string, any> | null;
    const registryData = {
      registryNumber: dto.registryNumber.trim(), pinfl: person.pinfl, type: RegistryType.MEDIATOR,
      fullName: person.fullName, phone: application.phone, email: application.email, address: questionnairePassport?.questionnaire?.practiceAddress || application.address,
      region: application.region, gender: person.gender, birthDate: person.birthDate || questionnairePassport?.birthDate ? new Date(person.birthDate || questionnairePassport.birthDate) : null,
      education: application.education, specialization: application.specialization, languages: application.languages,
      status: RegistryEntryStatus.ACTIVE, publicProfile: true, registeredAt: new Date(), createdById: actor.id,
    };
    let entry: Awaited<ReturnType<typeof this.prisma.registryEntry.upsert>>;
    try {
      entry = await this.prisma.$transaction(async (tx) => {
        const registryEntry = await tx.registryEntry.upsert({
          where: { userId_type: { userId: person.id, type: RegistryType.MEDIATOR } },
          create: { ...registryData, userId: person.id },
          update: registryData,
        });
        await tx.user.update({ where: { id: person.id }, data: { registryStatus: RegistryStatus.MEDIATOR, cabinetType: CabinetType.SPECIALIST } });
        const applicantRole = await tx.role.findUnique({ where: { name: 'MEDIATOR_APPLICANT' }, select: { id: true } });
        if (applicantRole) await tx.userRole.deleteMany({ where: { userId: person.id, roleId: applicantRole.id } });
        await tx.mediatorDossier.upsert({ where: { mediatorId: person.id }, create: { mediatorId: person.id, registeredYear: new Date().getFullYear(), region: application.region, specialization: application.specialization }, update: { registryStatus: 'ACTIVE', region: application.region, specialization: application.specialization } });
        await tx.mkApplication.update({ where: { id: applicationId }, data: { status: MkApplicationStatus.REGISTERED, registryDeadline: null } });
        await tx.registryStatusHistory.create({ data: { registryEntryId: registryEntry.id, status: RegistryEntryStatus.ACTIVE, reason: `Malaka imtihoni va hududiy organ qarori asosida${isExamExempt ? ' (imtihondan ozod qilingan)' : ''}`, changedById: actor.id } });
        return registryEntry;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Ushbu PINFL yoki reyestr raqami bilan yozuv avvaldan mavjud');
      throw error;
    }
    await this.notify(person.id, `Siz mediatorlar reyestriga ${dto.registryNumber.trim()} raqami bilan kiritildingiz. Mediator kabineti faollashtirildi.`, `mk-${applicationId}-registered`);
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'REGISTER_MK_APPLICANT', entityType: 'MEDIATOR_REGISTRY', entityId: entry.id, newValues: { registryNumber: dto.registryNumber.trim(), reason: isExamExempt ? 'EXAM_EXEMPT' : 'EXAM_PASSED' }, ipAddress });
    return { applicationId, registryEntryId: entry.id, status: MkApplicationStatus.REGISTERED, registryNumber: entry.registryNumber };
  }

  private staffRegion(user: AuthUser) { return user.region || user.organization?.region || null; }

  private assertRegionalScope(user: AuthUser, applicationRegion: string) {
    const regional = user.roles.includes('REGIONAL_STAFF');
    if (!regional) return;
    const region = this.staffRegion(user);
    if (!region || region.toLocaleLowerCase() !== applicationRegion.toLocaleLowerCase()) throw new ForbiddenException('Faqat o‘z hududingizdagi arizalarni ko‘rishingiz mumkin');
  }

  private rejectionLabel(code: string) {
    return ({
      LEGAL_INELIGIBILITY: 'Talabgor qonunchilikda belgilangan mediator maqomi talablariga mos emas.',
      CORRECTIONS_NOT_FIXED: 'Arizadagi kamchiliklar belgilangan muddatda bartaraf etilmadi.',
      FAILED_EXAM_WAITING_PERIOD: 'Malaka imtihonidan muvaffaqiyatsiz o‘tganidan keyin uch oy to‘lmagan.',
      QUALIFICATION_EXAM_FAILED: 'Talabgor malaka imtihonidan muvaffaqiyatli o‘tmadi.',
    } as Record<string, string>)[code] || 'Ariza rad etildi.';
  }

  private addBusinessDays(date: Date, days: number) {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) added++;
    }
    return result;
  }

  private addCalendarMonths(date: Date, months: number) {
    const result = new Date(date);
    const day = result.getDate();
    result.setMonth(result.getMonth() + months);
    if (result.getDate() < day) result.setDate(0);
    return result;
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
