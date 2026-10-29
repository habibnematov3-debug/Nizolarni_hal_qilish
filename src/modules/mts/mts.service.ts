import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ConsentStatus, DocumentExchangeAction, DocumentExchangeStatus, DocumentExchangeType, MediationStatus, MediationType, MedResultStatus, ParticipantSide, Prisma, RegistryStatus } from '@prisma/client';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { EsignIntegrationAdapter } from '../integration/adapters/esign.adapter';
import { VideoConferenceIntegrationAdapter } from '../integration/adapters/video-conference.adapter';
import { CourtSystemIntegrationAdapter } from '../integration/adapters/court-system.adapter';
import { MonService } from '../mon/mon.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ConsentDto, CreateAgreementDto, CreateMediationDto, CreateMediationFeedbackDto, RecordResultDto, ScheduleSessionDto, SelectMediatorDto, SignAgreementDto } from './dto/mts.dto';

@Injectable()
export class MtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly esign: EsignIntegrationAdapter,
    private readonly video: VideoConferenceIntegrationAdapter,
    private readonly court: CourtSystemIntegrationAdapter,
    private readonly monitoring: MonService,
  ) {}

  async create(user: AuthUser, dto: CreateMediationDto) {
    if (!user.roles.some((role) => role === 'TALABGOR' || role === 'BUSINESS')) throw new ForbiddenException('Mediatsiya murojaatini fuqaro yoki yuridik shaxs yuborishi mumkin');
    if (dto.privacyAccepted !== true) throw new BadRequestException('Shaxsiy ma’lumotlardan foydalanishga rozilik talab qilinadi');
    const privacyConsentVersion = this.getPrivacyConsentVersion();
    const privacyConsentAt = new Date();
    if (dto.type === MediationType.MANDATORY && !dto.courtCaseNumber?.trim()) {
      throw new BadRequestException('Majburiy mediatsiya uchun sud ishi raqami majburiy');
    }
    const claimant = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, fullName: true, phone: true, email: true, pinfl: true },
    });
    if (!claimant?.phone || !claimant.pinfl || !/^\d{14}$/.test(claimant.pinfl)) {
      throw new BadRequestException('Murojaat yuborish uchun OneID profilidagi PINFL va telefon raqamini to‘ldiring');
    }
    const normalizedPhone = this.normalizePhone(dto.respondentPhone);
    const respondentByPinfl = dto.respondentPinfl
      ? await this.prisma.user.findUnique({ where: { pinfl: dto.respondentPinfl }, select: { id: true, fullName: true, phone: true, email: true, pinfl: true } })
      : null;
    const respondentByPhone = await this.prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true, fullName: true, phone: true, email: true, pinfl: true } });
    if (respondentByPinfl && respondentByPhone && respondentByPinfl.id !== respondentByPhone.id) {
      throw new BadRequestException('Javobgar PINFL va telefon raqami turli foydalanuvchilarga tegishli');
    }
    const linkedRespondent = respondentByPinfl || respondentByPhone;
    if (linkedRespondent?.id === claimant.id) throw new BadRequestException('Ariza beruvchi o‘ziga qarshi murojaat yubora olmaydi');
    if (linkedRespondent && dto.respondentPinfl && linkedRespondent.pinfl !== dto.respondentPinfl) {
      throw new BadRequestException('Javobgar PINFL foydalanuvchi profiliga mos kelmadi');
    }
    if (linkedRespondent?.phone && this.normalizePhone(linkedRespondent.phone) !== normalizedPhone) {
      throw new BadRequestException('Javobgar telefon raqami profil ma’lumotiga mos kelmadi');
    }
    const respondentName = linkedRespondent?.fullName || dto.respondentName.trim();
    const respondentPhone = linkedRespondent?.phone || normalizedPhone;
    const attachmentIds = [...new Set(dto.attachmentIds || [])];
    if (attachmentIds.length) {
      const ownedFiles = await this.prisma.fileRecord.findMany({ where: { id: { in: attachmentIds }, uploadedById: user.id, accessLevel: 'PRIVATE' }, select: { id: true } });
      if (ownedFiles.length !== attachmentIds.length) throw new ForbiddenException('Arizaga faqat o‘zingiz yuklagan shaxsiy fayllarni biriktirishingiz mumkin');
    }
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.mediationCase.create({ data: {
        courtCaseNumber: dto.courtCaseNumber?.trim() || null,
        type: dto.type,
        disputeCategory: dto.disputeCategory,
        region: dto.region.trim(),
        disputeSubject: dto.disputeSubject.trim(),
        initiatedById: user.id,
        participants: { create: [
          { side: ParticipantSide.CLAIMANT, userId: user.id, fullName: claimant.fullName, phone: claimant.phone, email: claimant.email, pinfl: claimant.pinfl, dataProcessingConsentAt: privacyConsentAt, dataProcessingConsentVersion: privacyConsentVersion },
          { side: ParticipantSide.RESPONDENT, userId: linkedRespondent?.id, fullName: respondentName, phone: respondentPhone, email: linkedRespondent?.email || dto.respondentEmail || null, pinfl: linkedRespondent?.pinfl || dto.respondentPinfl || null },
        ] },
      }, include: { participants: true } });
      if (attachmentIds.length) {
        await tx.documentExchangeThread.create({ data: {
          type: DocumentExchangeType.MEDIATION,
          status: DocumentExchangeStatus.SUBMITTED,
          subject: `Mediatsiya hujjatlari · ${created.disputeSubject}`,
          region: created.region,
          mediationId: created.id,
          createdById: user.id,
          messages: { create: {
            senderId: user.id,
            action: DocumentExchangeAction.MESSAGE,
            body: 'Mediatsiya murojaatiga tasdiqlovchi hujjatlar ilova qilindi.',
            attachments: { create: attachmentIds.map((fileId) => ({ fileId })) },
          } },
        } });
      }
      return created;
    });
    await this.notifyParticipants(item.id, 'Mediatsiya jarayoni boshlandi. Roziligingizni bildiring.', `mts-${item.id}-started`);
    return item;
  }

  private normalizePhone(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 9) return `+998${digits}`;
    if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
    throw new BadRequestException('Telefon raqamini +998 XX XXX XX XX formatida kiriting');
  }

  private getPrivacyConsentVersion() {
    const version = process.env.MTS_PRIVACY_CONSENT_VERSION?.trim();
    if (process.env.NODE_ENV === 'production' && !version) {
      throw new ServiceUnavailableException('Adliya tomonidan tasdiqlangan mediatsiya maxfiylik roziligi versiyasi sozlanmagan');
    }
    return version || 'demo-v1';
  }

  async list(user: AuthUser) {
    const participantAccess: Prisma.MediationCaseWhereInput[] = [{ participants: { some: { userId: user.id } } }];
    if (user.pinfl) participantAccess.push({ participants: { some: { pinfl: user.pinfl } } });
    return this.prisma.mediationCase.findMany({ where: { OR: [{ initiatedById: user.id }, { mediatorId: user.id }, ...participantAccess] }, include: { participants: true, sessions: true, feedbacks: { where: { userId: user.id }, select: { id: true, score: true, comment: true, createdAt: true } } }, orderBy: { updatedAt: 'desc' } });
  }

  async rate(user: AuthUser, id: string, dto: CreateMediationFeedbackDto, ipAddress?: string) {
    const item = await this.getCase(id);
    const participant = item.participants.find((entry) => entry.userId === user.id || (!!user.pinfl && entry.pinfl === user.pinfl));
    if (!participant) throw new ForbiddenException('Bahoni faqat ushbu mediatsiya taraflari yuborishi mumkin');
    if (![MediationStatus.SETTLED, MediationStatus.FAILED].includes(item.status)) throw new ConflictException('Baholash faqat mediatsiya yakunlangandan keyin mumkin');
    if (!item.mediatorId) throw new ConflictException('Baholash uchun mediator biriktirilmagan');
    try {
      const feedback = await this.prisma.mediationFeedback.create({ data: { mediationId: id, userId: user.id, specialistId: item.mediatorId, score: dto.score, comment: dto.comment?.trim() || null } });
      await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'RATE_MEDIATION_SPECIALIST', entityType: 'MEDIATION_CASE', entityId: id, newValues: { score: dto.score }, ipAddress });
      return feedback;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ushbu mediatsiya bo‘yicha baho avval yuborilgan');
      throw error;
    }
  }

  async get(user: AuthUser, id: string) {
    const item = await this.getCase(id);
    this.assertParticipantOrMediator(user, item);
    return item;
  }

  private async getCase(id: string) {
    const item = await this.prisma.mediationCase.findUnique({ where: { id }, include: { participants: true, sessions: true } });
    if (!item) throw new NotFoundException('Mediatsiya ishi topilmadi');
    return item;
  }

  private assertParticipantOrMediator(user: AuthUser, item: { initiatedById: string; mediatorId: string | null; participants: { userId: string | null; pinfl: string | null }[] }) {
    if (user.roles.includes('ADMIN') || item.initiatedById === user.id || item.mediatorId === user.id || item.participants.some((participant) => participant.userId === user.id || (!!user.pinfl && participant.pinfl === user.pinfl))) return;
    throw new ForbiddenException('Mediatsiya ishiga kirish huquqi yo\'q');
  }

  async consent(user: AuthUser, id: string, dto: ConsentDto) {
    const item = await this.getCase(id);
    if (item.status !== MediationStatus.AWAITING_CONSENT) throw new ConflictException('Rozilik faqat yangi murojaat bosqichida beriladi');
    if (dto.status === 'CONSENTED' && dto.privacyAccepted !== true) throw new BadRequestException('Rozilikdan oldin shaxsiy ma’lumotlarni qayta ishlash shartlariga rozilik bering');
    const consentAt = dto.status === 'CONSENTED' ? new Date() : null;
    const privacyConsentVersion = consentAt ? this.getPrivacyConsentVersion() : null;
    const participant = item.participants.find((candidate) => candidate.side === dto.side && (candidate.userId === user.id || (user.pinfl && candidate.pinfl === user.pinfl)));
    if (!participant) throw new ForbiddenException('Siz ushbu taraf sifatida ro\'yxatdan o\'tmagansiz');
    if (participant.consentStatus !== ConsentStatus.PENDING) throw new ConflictException('Sizning rozilik javobingiz avval qayd etilgan');
    const responseCount = await this.prisma.mediationParticipant.updateMany({
      where: { id: participant.id, consentStatus: ConsentStatus.PENDING },
      data: { consentStatus: dto.status, consentedAt: consentAt, dataProcessingConsentAt: consentAt, dataProcessingConsentVersion: privacyConsentVersion },
    });
    if (responseCount.count !== 1) throw new ConflictException('Rozilik javobi avval qayd etilgan');
    const updated = await this.prisma.mediationParticipant.findUnique({ where: { id: participant.id } });
    const participants = await this.prisma.mediationParticipant.findMany({ where: { mediationId: id } });
    if (participants.some((candidate) => candidate.consentStatus === ConsentStatus.DECLINED)) {
      await this.prisma.mediationCase.updateMany({ where: { id, status: MediationStatus.AWAITING_CONSENT }, data: { status: MediationStatus.CLOSED } });
    }
    else if (participants.every((candidate) => candidate.consentStatus === ConsentStatus.CONSENTED)) {
      const transitioned = await this.prisma.mediationCase.updateMany({ where: { id, status: MediationStatus.AWAITING_CONSENT }, data: { status: MediationStatus.MEDIATOR_REQUESTED } });
      if (transitioned.count === 1 && item.type === MediationType.MANDATORY) await this.assignRandomMediatorInternal(user, { ...item, status: MediationStatus.MEDIATOR_REQUESTED });
    }
    return updated;
  }

  async selectMediator(user: AuthUser, id: string, dto: SelectMediatorDto) {
    const item = await this.getCase(id);
    const claimant = item.participants.find((candidate) => candidate.side === ParticipantSide.CLAIMANT && (candidate.userId === user.id || (user.pinfl && candidate.pinfl === user.pinfl)));
    if (!claimant) throw new ForbiddenException('Mediatorni faqat ariza beruvchi tanlashi mumkin');
    if (item.type === MediationType.MANDATORY) throw new ConflictException('Majburiy mediatsiyada mediator tizim tomonidan tanlanadi');
    if (item.status !== MediationStatus.MEDIATOR_REQUESTED || item.mediatorId) throw new ConflictException('Ushbu bosqichda mediator tanlab bo‘lmaydi');
    if (!(await this.prisma.mediationParticipant.count({ where: { mediationId: id, consentStatus: ConsentStatus.CONSENTED } }) === 2)) throw new ConflictException('Mediator tanlashdan oldin ikki taraf roziligi kerak');
    const entry = await this.prisma.registryEntry.findFirst({ where: { id: dto.mediatorRegistryId, type: 'MEDIATOR', status: 'ACTIVE', publicProfile: true, deletedAt: null } });
    if (!entry?.userId) throw new NotFoundException('Faol ochiq reyestr mediatori topilmadi');
    const mediator = await this.prisma.user.findFirst({ where: { id: entry.userId, registryStatus: RegistryStatus.MEDIATOR, status: 'ACTIVE' } });
    if (!mediator) throw new NotFoundException('Faol mediator kabineti topilmadi');
    const assigned = await this.prisma.mediationCase.updateMany({ where: { id, status: MediationStatus.MEDIATOR_REQUESTED, mediatorId: null }, data: { mediatorId: mediator.id } });
    if (assigned.count !== 1) throw new ConflictException('Mediator allaqachon tanlangan yoki murojaat bosqichi o‘zgargan');
    await this.notifications.send({ userId: mediator.id, templateCode: 'APPLICATION_STATUS', variables: { title: 'Yangi mediatsiya murojaati', content: 'Sizga yangi mediatsiya murojaati yuborildi.' }, idempotencyKey: `mts-${id}-mediator-request`, channels: ['CABINET', 'SMS'] as any });
    return this.getCase(id);
  }

  private async assignRandomMediatorInternal(user: AuthUser, item: Awaited<ReturnType<MtsService['getCase']>>) {
    if (item.type !== MediationType.MANDATORY || item.status !== MediationStatus.MEDIATOR_REQUESTED || item.mediatorId) return null;
    const consentCount = await this.prisma.mediationParticipant.count({ where: { mediationId: item.id, consentStatus: ConsentStatus.CONSENTED } });
    if (consentCount !== 2) return null;
    const eligibleCandidates = await this.prisma.user.findMany({
      where: { registryStatus: RegistryStatus.MEDIATOR, status: 'ACTIVE', dossier: { is: { registryStatus: 'ACTIVE', specialization: { has: item.disputeCategory } } } },
      select: { id: true, dossier: { select: { region: true, specialization: true } } },
    });
    const normalizeRegion = (value: string) => value.toLocaleLowerCase('uz').replace(/[‘’ʻ`']/g, '').replace(/\s+/g, '');
    const regionKey = normalizeRegion(item.region);
    const candidates = eligibleCandidates.filter((candidate) => candidate.dossier && normalizeRegion(candidate.dossier.region) === regionKey);
    if (!candidates.length) {
      await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'MANDATORY_MEDIATOR_ASSIGNMENT_PENDING', entityType: 'MEDIATION_CASE', entityId: item.id, newValues: { region: item.region, disputeCategory: item.disputeCategory, reason: 'NO_ELIGIBLE_MEDIATOR' } });
      return null;
    }
    const activeCases = await this.prisma.mediationCase.groupBy({
      by: ['mediatorId'],
      where: { mediatorId: { in: candidates.map((candidate) => candidate.id) }, status: { in: [MediationStatus.MEDIATOR_ASSIGNED, MediationStatus.AGREEMENT_PENDING_SIGNATURE, MediationStatus.SCHEDULED, MediationStatus.IN_SESSION] } },
      _count: { _all: true },
    });
    const loadByMediator = new Map(activeCases.map((row) => [row.mediatorId, row._count._all]));
    const minLoad = Math.min(...candidates.map((candidate) => loadByMediator.get(candidate.id) || 0));
    const leastLoaded = candidates.filter((candidate) => (loadByMediator.get(candidate.id) || 0) === minLoad);
    const selected = leastLoaded[randomInt(leastLoaded.length)];
    const seed = randomBytes(24).toString('hex');
    const selectionLog = {
      method: 'REGION_SPECIALTY_LOWEST_CASELOAD_RANDOM_TIE_BREAK',
      region: item.region,
      disputeCategory: item.disputeCategory,
      candidateCount: candidates.length,
      minimumActiveCaseLoad: minLoad,
      leastLoadedCandidateIds: leastLoaded.map((candidate) => candidate.id),
      selectedId: selected.id,
      seed,
      selectedAt: new Date().toISOString(),
    };
    const updated = await this.prisma.mediationCase.updateMany({
      where: { id: item.id, type: MediationType.MANDATORY, status: MediationStatus.MEDIATOR_REQUESTED, mediatorId: null },
      data: { mediatorId: selected.id, status: MediationStatus.MEDIATOR_ASSIGNED, randomSeed: seed, selectionLog: selectionLog as unknown as Prisma.InputJsonValue },
    });
    if (updated.count !== 1) return null;
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'AUTO_ASSIGN_MANDATORY_MEDIATOR', entityType: 'MEDIATION_CASE', entityId: item.id, newValues: selectionLog });
    await this.notifications.send({ userId: selected.id, templateCode: 'APPLICATION_STATUS', variables: { title: 'Majburiy mediatsiya tayinlandi', content: 'Hudud, ixtisoslik va joriy ish yuklamasi bo‘yicha sizga mediatsiya tayinlandi.' }, idempotencyKey: `mts-${item.id}-random-${seed}`, channels: ['CABINET', 'SMS'] as any });
    return selected.id;
  }

  async createAgreement(user: AuthUser, id: string, dto: CreateAgreementDto) {
    const item = await this.getCase(id);
    if (item.mediatorId !== user.id) throw new ForbiddenException('Kelishuv loyihasini faqat biriktirilgan mediator tayyorlaydi');
    if (item.status !== MediationStatus.MEDIATOR_ASSIGNED && item.status !== MediationStatus.AGREEMENT_PENDING_SIGNATURE) throw new ConflictException('Kelishuv faqat mediator tayinlangandan keyin tayyorlanadi');
    if (item.participants.length !== 2 || item.participants.some((participant) => participant.consentStatus !== ConsentStatus.CONSENTED)) throw new ConflictException('Kelishuvdan oldin ikki taraf roziligi kerak');
    if (item.mediatorSignaturePkcs7 || item.participants.some((participant) => participant.signaturePkcs7)) throw new ConflictException('Imzolangan kelishuv matnini almashtirib bo‘lmaydi');
    return this.prisma.mediationCase.update({ where: { id }, data: { agreementText: dto.text.trim(), agreementFileUrl: null, status: MediationStatus.AGREEMENT_PENDING_SIGNATURE } });
  }

  async signAgreement(user: AuthUser, id: string, dto: SignAgreementDto) {
    const item = await this.getCase(id);
    this.assertParticipantOrMediator(user, item);
    if (item.status !== MediationStatus.AGREEMENT_PENDING_SIGNATURE || !item.agreementText) throw new ConflictException('Imzolash uchun mediator tayyorlagan kelishuv matni kerak');
    if (!user.pinfl || !/^\d{14}$/.test(user.pinfl)) throw new ForbiddenException('Elektron imzo uchun tekshirilgan PINFL talab qilinadi');
    const digest = createHash('sha256').update(item.agreementText, 'utf8').digest('hex');
    const verified = await this.esign.verifyPkcs7(dto.pkcs7, digest);
    if (!verified.valid || verified.pinfl !== user.pinfl) throw new ForbiddenException('Elektron imzo yaroqsiz yoki imzolovchining PINFLi mos emas');
    if (item.mediatorId === user.id) {
      if (item.mediatorSignaturePkcs7) throw new ConflictException('Mediator kelishuvni avval imzolagan');
      const updatedCase = await this.prisma.mediationCase.update({ where: { id }, data: { mediatorSignaturePkcs7: dto.pkcs7, mediatorSignedAt: new Date() } });
      const participants = await this.prisma.mediationParticipant.findMany({ where: { mediationId: id } });
      if (participants.length === 2 && participants.every((candidate) => candidate.signedAt)) await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.SCHEDULED } });
      return updatedCase;
    }
    const participant = item.participants.find((candidate) => candidate.userId === user.id || candidate.pinfl === user.pinfl);
    if (!participant || participant.consentStatus !== ConsentStatus.CONSENTED) throw new ForbiddenException('Kelishuvni faqat rozilik bergan taraf imzolaydi');
    if (participant.signaturePkcs7) throw new ConflictException('Siz kelishuvni avval imzolagansiz');
    const signatureCount = await this.prisma.mediationParticipant.updateMany({ where: { id: participant.id, signaturePkcs7: null }, data: { signaturePkcs7: dto.pkcs7, signedAt: new Date() } });
    if (signatureCount.count !== 1) throw new ConflictException('Imzo oldinroq qayd etilgan');
    const participants = await this.prisma.mediationParticipant.findMany({ where: { mediationId: id } });
    const caseUpdated = await this.prisma.mediationCase.findUnique({ where: { id } });
    if (participants.length === 2 && participants.every((candidate) => candidate.signedAt) && caseUpdated?.mediatorSignaturePkcs7) await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.SCHEDULED } });
    return this.prisma.mediationParticipant.findUnique({ where: { id: participant.id } });
  }

  async scheduleSession(user: AuthUser, id: string, dto: ScheduleSessionDto) {
    const item = await this.getCase(id);
    if (item.mediatorId !== user.id) throw new ForbiddenException('Faqat biriktirilgan mediator sana belgilashi mumkin');
    if (!item.mediatorSignaturePkcs7 || item.participants.some((participant) => !participant.signaturePkcs7)) throw new ConflictException('Kelishuv barcha taraflar va mediator tomonidan imzolanmagan');
    if (new Date(dto.scheduledAt).getTime() <= Date.now()) throw new BadRequestException('Uchrashuv vaqti kelajakda bo‘lishi kerak');
    if (item.status !== MediationStatus.SCHEDULED) throw new ConflictException('Uchrashuv faqat imzolangan mediatsiya kelishuvi uchun belgilanadi');
    if (await this.prisma.mediationSession.count({ where: { mediationId: id, status: { in: ['SCHEDULED', 'STARTED'] } } })) throw new ConflictException('Ushbu mediatsiyada faol uchrashuv allaqachon bor');
    const details = await this.video.createMeeting(`Mediatsiya: ${item.disputeSubject}`, dto.scheduledAt, dto.durationMin || 60);
    const session = await this.prisma.mediationSession.create({ data: { mediationId: id, scheduledAt: new Date(dto.scheduledAt), durationMin: dto.durationMin || 60, roomId: details.roomId, roomUrl: details.roomUrl, hostUrl: null, accessPin: null } });
    await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.SCHEDULED } });
    await this.notifyParticipants(id, `Mediatsiya uchrashuvi ${new Date(dto.scheduledAt).toLocaleString('uz-UZ')} vaqtiga belgilandi. Havola shaxsiy kabinetdan ochiladi.`, `mts-${id}-session-${session.id}`);
    return session;
  }

  async joinSession(user: AuthUser, mediationId: string, sessionId: string) {
    const item = await this.getCase(mediationId);
    this.assertParticipantOrMediator(user, item);
    const session = item.sessions.find((candidate) => candidate.id === sessionId);
    if (!session || !session.roomId) throw new NotFoundException('Videokonferensiya sessiyasi topilmadi');
    if (session.status === 'CANCELLED' || session.status === 'FINISHED') throw new ConflictException('Uchrashuv yopilgan');
    const participant = item.participants.find((candidate) => candidate.userId === user.id || (!!user.pinfl && candidate.pinfl === user.pinfl));
    const isMediator = item.mediatorId === user.id;
    if (!isMediator && (!participant || participant.consentStatus !== ConsentStatus.CONSENTED || !participant.signaturePkcs7)) {
      throw new ForbiddenException('Uchrashuvga faqat rozilik bergan va kelishuvni imzolagan taraflar qo‘shila oladi');
    }
    if (!item.mediatorSignaturePkcs7 || item.participants.some((candidate) => !candidate.signaturePkcs7)) {
      throw new ConflictException('Kelishuv imzolari to‘liq emas');
    }
    const now = Date.now();
    const start = new Date(session.scheduledAt).getTime();
    const end = start + session.durationMin * 60_000;
    if (now < start - 15 * 60_000) throw new ConflictException('Videokonferensiya uchrashuv boshlanishidan 15 daqiqa oldin ochiladi');
    if (now > end + 30 * 60_000) throw new ConflictException('Videokonferensiya oynasi yopilgan');
    const profile = await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, fullName: true, email: true } });
    if (!profile) throw new NotFoundException('Foydalanuvchi profili topilmadi');
    const join = this.video.createJoinLink(session.roomId, { id: profile.id, name: profile.fullName, email: profile.email }, isMediator, new Date(Math.min(end + 30 * 60_000, now + 60 * 60_000)));
    if (session.status === 'SCHEDULED') {
      await this.prisma.mediationSession.update({ where: { id: sessionId }, data: { status: 'STARTED' } });
      await this.prisma.mediationCase.update({ where: { id: mediationId }, data: { status: MediationStatus.IN_SESSION } });
    }
    return join;
  }

  async recordResult(user: AuthUser, id: string, dto: RecordResultDto) {
    const item = await this.getCase(id);
    if (item.mediatorId !== user.id) throw new ForbiddenException('Faqat biriktirilgan mediator natija qayd etadi');
    if (item.status !== MediationStatus.IN_SESSION) throw new ConflictException('Natija faqat boshlangan mediatsiya sessiyasidan keyin qayd etiladi');
    if (dto.resultStatus === MedResultStatus.SETTLED && !dto.agreementText && !item.agreementText && !dto.agreementFileUrl) throw new BadRequestException('Kelishuv natijasi uchun imzolangan kelishuv matni yoki hujjati kerak');
    const updated = await this.prisma.mediationCase.update({ where: { id }, data: { resultStatus: dto.resultStatus, resultSummary: dto.summary.trim(), agreementText: dto.agreementText?.trim() || item.agreementText, agreementFileUrl: dto.agreementFileUrl || item.agreementFileUrl, status: dto.resultStatus === MedResultStatus.SETTLED ? MediationStatus.SETTLED : MediationStatus.FAILED } });
    await this.prisma.mediationSession.updateMany({ where: { mediationId: id, status: 'STARTED' }, data: { status: 'FINISHED' } });
    if (item.courtCaseNumber) {
      try {
        const sync = await this.court.sendMediationResultToCourt(item.courtCaseNumber, dto.resultStatus, dto.summary);
        await this.prisma.mediationCase.update({ where: { id }, data: { courtSyncStatus: sync.acknowledged ? 'SENT' : 'FAILED', courtSyncError: sync.acknowledged ? null : 'Sud tizimi tasdiqlamadi' } });
      } catch (error) {
        await this.prisma.mediationCase.update({ where: { id }, data: { courtSyncStatus: 'FAILED', courtSyncError: error instanceof Error ? error.message : String(error) } });
      }
    }
    if (dto.resultStatus === MedResultStatus.SETTLED) {
      await this.notifyParticipants(id, 'Mediatsiya kelishuvi rasmiylashtirildi.', `mts-${id}-settled`);
      for (const obligation of dto.obligations || []) {
        const responsibleParty = item.participants.find((participant) => participant.side === obligation.side);
        if (!responsibleParty) throw new BadRequestException('Kelishuv majburiyati uchun taraf topilmadi');
        await this.monitoring.create(user, {
          agreementId: id,
          description: obligation.description,
          dueDate: obligation.dueDate,
          responsiblePartyId: responsibleParty.userId || undefined,
          responsiblePartyPinfl: responsibleParty.pinfl || undefined,
          responsiblePartyName: responsibleParty.fullName,
          mediatorId: item.mediatorId || user.id,
          region: item.region,
        });
      }
    }
    return updated;
  }

  private async notifyParticipants(id: string, content: string, key: string) {
    const item = await this.prisma.mediationCase.findUnique({ where: { id }, include: { participants: true } });
    if (!item) return;
    const ids = [...new Set(item.participants.map((participant) => participant.userId).filter((value): value is string => Boolean(value)))];
    for (const userId of ids) await this.notifications.send({ userId, templateCode: 'CONTRACT_STATUS', variables: { title: 'Mediatsiya xabarnomasi', content }, idempotencyKey: `${key}-${userId}`, channels: ['CABINET', 'SMS'] as any });
  }
}
