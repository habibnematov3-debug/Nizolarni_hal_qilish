import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentStatus, MediationStatus, MediationType, MedResultStatus, ParticipantSide, Prisma, RegistryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { EsignIntegrationAdapter } from '../integration/adapters/esign.adapter';
import { VideoConferenceIntegrationAdapter } from '../integration/adapters/video-conference.adapter';
import { CourtSystemIntegrationAdapter } from '../integration/adapters/court-system.adapter';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ConsentDto, CreateMediationDto, RecordResultDto, ScheduleSessionDto, SelectMediatorDto, SignAgreementDto } from './dto/mts.dto';

@Injectable()
export class MtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly esign: EsignIntegrationAdapter,
    private readonly video: VideoConferenceIntegrationAdapter,
    private readonly court: CourtSystemIntegrationAdapter,
  ) {}

  async create(user: AuthUser, dto: CreateMediationDto) {
    const item = await this.prisma.mediationCase.create({ data: {
      courtCaseNumber: dto.courtCaseNumber, type: dto.type, disputeSubject: dto.disputeSubject, initiatedById: user.id,
      participants: { create: [
        { side: ParticipantSide.CLAIMANT, userId: user.id, fullName: dto.claimantName, phone: dto.claimantPhone, pinfl: dto.claimantPinfl },
        { side: ParticipantSide.RESPONDENT, userId: dto.respondentUserId, fullName: dto.respondentName, phone: dto.respondentPhone, pinfl: dto.respondentPinfl },
      ] },
    }, include: { participants: true } });
    await this.notifyParticipants(item.id, 'Mediatsiya jarayoni boshlandi. Roziligingizni bildiring.', `mts-${item.id}-started`);
    return item;
  }

  async list(user: AuthUser) {
    return this.prisma.mediationCase.findMany({ where: { OR: [{ initiatedById: user.id }, { mediatorId: user.id }, { participants: { some: { userId: user.id } } }] }, include: { participants: true, sessions: true }, orderBy: { updatedAt: 'desc' } });
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
    this.assertParticipantOrMediator(user, item);
    const participant = item.participants.find((candidate) => candidate.side === dto.side && (candidate.userId === user.id || (user.pinfl && candidate.pinfl === user.pinfl)));
    if (!participant) throw new ForbiddenException('Siz ushbu taraf sifatida ro\'yxatdan o\'tmagansiz');
    const updated = await this.prisma.mediationParticipant.update({ where: { id: participant.id }, data: { consentStatus: dto.status, consentedAt: new Date() } });
    const participants = await this.prisma.mediationParticipant.findMany({ where: { mediationId: id } });
    if (participants.some((candidate) => candidate.consentStatus === ConsentStatus.DECLINED)) await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.CLOSED } });
    else if (participants.every((candidate) => candidate.consentStatus === ConsentStatus.CONSENTED)) await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.MEDIATOR_REQUESTED } });
    return updated;
  }

  async selectMediator(user: AuthUser, id: string, dto: SelectMediatorDto) {
    const item = await this.getCase(id);
    this.assertParticipantOrMediator(user, item);
    if (item.type === MediationType.MANDATORY) throw new ConflictException('Majburiy mediatsiyada mediator tizim tomonidan tanlanadi');
    if (!(await this.prisma.mediationParticipant.count({ where: { mediationId: id, consentStatus: ConsentStatus.CONSENTED } }) === 2)) throw new ConflictException('Mediator tanlashdan oldin ikki taraf roziligi kerak');
    const mediator = await this.prisma.user.findFirst({ where: { id: dto.mediatorId, registryStatus: RegistryStatus.MEDIATOR, status: 'ACTIVE' } });
    if (!mediator) throw new NotFoundException('Faol mediator topilmadi');
    const updated = await this.prisma.mediationCase.update({ where: { id }, data: { mediatorId: mediator.id, status: MediationStatus.MEDIATOR_REQUESTED } });
    await this.notifications.send({ userId: mediator.id, templateCode: 'APPLICATION_STATUS', variables: { title: 'Yangi mediatsiya murojaati', content: 'Sizga yangi mediatsiya murojaati yuborildi.' }, idempotencyKey: `mts-${id}-mediator-request`, channels: ['CABINET', 'SMS'] as any });
    return updated;
  }

  async assignRandomMediator(user: AuthUser, id: string) {
    const item = await this.getCase(id);
    this.assertParticipantOrMediator(user, item);
    if (item.type !== MediationType.MANDATORY) throw new ConflictException('Random tanlash faqat majburiy mediatsiya uchun');
    const candidates = await this.prisma.user.findMany({ where: { registryStatus: RegistryStatus.MEDIATOR, status: 'ACTIVE' }, include: { dossier: true } });
    if (!candidates.length) throw new NotFoundException('Faol mediatorlar topilmadi');
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.mediationCase.update({ where: { id }, data: { mediatorId: selected.id, status: MediationStatus.MEDIATOR_ASSIGNED, randomSeed: seed, selectionLog: { selectedId: selected.id, candidateCount: candidates.length, seed } } });
      await this.notifications.send({ userId: selected.id, templateCode: 'APPLICATION_STATUS', variables: { title: 'Majburiy mediatsiya tayinlandi', content: 'Sizga majburiy mediatsiya tayinlandi.' }, idempotencyKey: `mts-${id}-random-${seed}`, channels: ['CABINET', 'SMS'] as any });
      return updated;
    });
  }

  async signAgreement(user: AuthUser, id: string, dto: SignAgreementDto) {
    const item = await this.getCase(id);
    this.assertParticipantOrMediator(user, item);
    const pkcs7 = dto.pkcs7 || (await this.esign.signDocument(`mediation:${id}`, user.pinfl || user.id)).pkcs7;
    if (dto.side === 'MEDIATOR') {
      if (item.mediatorId !== user.id) throw new ForbiddenException('Faqat biriktirilgan mediator imzolashi mumkin');
      return this.prisma.mediationCase.update({ where: { id }, data: { mediatorSignaturePkcs7: pkcs7, mediatorSignedAt: new Date() } });
    }
    const participant = item.participants.find((candidate) => candidate.side === dto.side && (candidate.userId === user.id || (user.pinfl && candidate.pinfl === user.pinfl)));
    if (!participant) throw new ForbiddenException('Siz ushbu taraf sifatida imzolay olmaysiz');
    const updated = await this.prisma.mediationParticipant.update({ where: { id: participant.id }, data: { signaturePkcs7: pkcs7, signedAt: new Date() } });
    const participants = await this.prisma.mediationParticipant.findMany({ where: { mediationId: id } });
    const caseUpdated = await this.prisma.mediationCase.findUnique({ where: { id } });
    if (participants.every((candidate) => candidate.signedAt) && caseUpdated?.mediatorSignaturePkcs7) await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.SCHEDULED } });
    return updated;
  }

  async scheduleSession(user: AuthUser, id: string, dto: ScheduleSessionDto) {
    const item = await this.getCase(id);
    if (item.mediatorId !== user.id) throw new ForbiddenException('Faqat biriktirilgan mediator sana belgilashi mumkin');
    if (!item.mediatorSignaturePkcs7 || item.participants.some((participant) => !participant.signaturePkcs7)) throw new ConflictException('Kelishuv barcha taraflar va mediator tomonidan imzolanmagan');
    const details = await this.video.createMeeting(`Mediatsiya: ${item.disputeSubject}`, dto.scheduledAt, dto.durationMin || 60);
    const session = await this.prisma.mediationSession.create({ data: { mediationId: id, scheduledAt: new Date(dto.scheduledAt), durationMin: dto.durationMin || 60, roomId: details.roomId, roomUrl: details.roomUrl, hostUrl: details.hostUrl, accessPin: details.pin } });
    await this.prisma.mediationCase.update({ where: { id }, data: { status: MediationStatus.SCHEDULED } });
    await this.notifyParticipants(id, `Mediatsiya uchrashuvi: ${new Date(dto.scheduledAt).toLocaleString('uz-UZ')}. Havola: ${details.roomUrl}`, `mts-${id}-session-${session.id}`);
    return session;
  }

  async recordResult(user: AuthUser, id: string, dto: RecordResultDto) {
    const item = await this.getCase(id);
    if (item.mediatorId !== user.id) throw new ForbiddenException('Faqat biriktirilgan mediator natija qayd etadi');
    if (dto.resultStatus === MedResultStatus.SETTLED && !dto.agreementText && !dto.agreementFileUrl) throw new BadRequestException('Kelishuv natijasi uchun kelishuv matni yoki hujjati kerak');
    const updated = await this.prisma.mediationCase.update({ where: { id }, data: { resultStatus: dto.resultStatus, resultSummary: dto.summary, agreementText: dto.agreementText, agreementFileUrl: dto.agreementFileUrl, status: dto.resultStatus === MedResultStatus.SETTLED ? MediationStatus.SETTLED : MediationStatus.FAILED } });
    if (item.courtCaseNumber) {
      try {
        const sync = await this.court.sendMediationResultToCourt(item.courtCaseNumber, dto.resultStatus, dto.summary);
        await this.prisma.mediationCase.update({ where: { id }, data: { courtSyncStatus: sync.acknowledged ? 'SENT' : 'FAILED', courtSyncError: sync.acknowledged ? null : 'Sud tizimi tasdiqlamadi' } });
      } catch (error) {
        await this.prisma.mediationCase.update({ where: { id }, data: { courtSyncStatus: 'FAILED', courtSyncError: error instanceof Error ? error.message : String(error) } });
      }
    }
    if (dto.resultStatus === MedResultStatus.SETTLED) await this.notifyParticipants(id, 'Mediatsiya kelishuvi rasmiylashtirildi va monitoringga yuborildi.', `mts-${id}-settled`);
    return updated;
  }

  private async notifyParticipants(id: string, content: string, key: string) {
    const item = await this.prisma.mediationCase.findUnique({ where: { id }, include: { participants: true } });
    if (!item) return;
    const ids = [...new Set(item.participants.map((participant) => participant.userId).filter((value): value is string => Boolean(value)))];
    for (const userId of ids) await this.notifications.send({ userId, templateCode: 'CONTRACT_STATUS', variables: { title: 'Mediatsiya xabarnomasi', content }, idempotencyKey: `${key}-${userId}`, channels: ['CABINET', 'SMS'] as any });
  }
}
