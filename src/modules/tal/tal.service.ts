import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma, RegistryEntryStatus, RegistryType } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SendThreadMessageDto, StartMediatorThreadDto, UpdateApplicantProfileDto } from './dto/tal.dto';

@Injectable()
export class TalService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async home(actor: AuthUser) {
    const [profile, applications, unreadNotifications] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actor.id }, select: { fullName: true, phone: true, email: true, cabinetType: true, registryStatus: true } }),
      this.prisma.mkApplication.findMany({ where: { applicantId: actor.id }, orderBy: { submittedAt: 'desc' }, take: 5, select: { id: true, status: true, submittedAt: true, rejectionReason: true, exams: { select: { id: true, status: true, scheduledAt: true } } } }),
      this.prisma.notification.count({ where: { userId: actor.id, isRead: false } }),
    ]);
    if (!profile) throw new NotFoundException('Foydalanuvchi topilmadi');
    const applicant = actor.roles.includes('TALABGOR');
    const menu = applicant
      ? [
          { key: 'profile', title: 'Shaxsiy ma’lumotlar', route: '/cabinet/profile' },
          { key: 'mediator-contact', title: 'Mediatorga murojaat', route: '/cabinet/threads' },
          { key: 'mediator-application', title: 'Mediator bo‘lish arizasi', route: '/cabinet/mk/applications' },
          { key: 'training-course', title: 'Maxsus o‘quv kursi', route: '/cabinet/training/course-info' },
          { key: 'notifications', title: 'Xabarlar', route: '/cabinet/notifications' },
          { key: 'contracts', title: 'Shartnomalar', route: '/contracts' },
          { key: 'online-mediation', title: 'Onlayn mediatsiya', route: '/cabinet/mts/mediations' },
        ]
      : [
          { key: 'profile', title: 'Shaxsiy ma’lumotlar', route: '/cabinet/profile' },
          { key: 'threads', title: 'Murojaat va chatlar', route: '/cabinet/threads' },
          { key: 'notifications', title: 'Xabarlar', route: '/cabinet/notifications' },
          ...(actor.roles.some((role) => ['MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR'].includes(role))
            ? [{ key: 'contracts', title: 'Shartnomalar', route: '/contracts' }, { key: 'online-mediation', title: 'Onlayn mediatsiya', route: '/cabinet/mts/mediations' }]
            : []),
        ];
    return { profile, applications, unreadNotifications, menu };
  }

  async getProfile(actor: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        id: true, username: true, fullName: true, pinfl: true, passportSeriesNumber: true,
        passportGivenDate: true, passportExpireDate: true, birthDate: true, birthPlace: true,
        nationality: true, gender: true, address: true, phone: true, email: true,
        registryStatus: true, cabinetType: true,
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async updateProfile(actor: AuthUser, dto: UpdateApplicantProfileDto) {
    if (dto.phone === undefined && dto.email === undefined && dto.address === undefined) {
      throw new BadRequestException('Tahrirlash uchun telefon, elektron pochta yoki manzil kiriting');
    }
    try {
      const updated = await this.prisma.user.update({ where: { id: actor.id }, data: dto });
      await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'UPDATE_TAL_PROFILE', entityType: 'USER_PROFILE', entityId: actor.id, newValues: dto });
      return this.getProfile({ ...actor, id: updated.id });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Ushbu telefon yoki elektron pochta boshqa foydalanuvchida ro‘yxatdan o‘tgan');
      throw error;
    }
  }

  async getCourseInfo() {
    const items = await this.prisma.content.findMany({
      where: { type: 'manuals', status: ContentStatus.PUBLISHED },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, titleUz: true, titleRu: true, titleEn: true, summaryUz: true, summaryRu: true, summaryEn: true, bodyUz: true, bodyRu: true, bodyEn: true, fileUrl: true, videoUrl: true, publishedAt: true, metadata: true },
    });
    const courseItems = items.filter((item) => {
      const metadata = item.metadata as Record<string, unknown> | null;
      return metadata?.module === 'TAL' && metadata?.topic === 'SPECIAL_COURSE';
    });
    return {
      title: 'Mediatorlar uchun maxsus o‘quv kursi',
      configured: courseItems.length > 0,
      items: courseItems,
      applicationRoute: '/cabinet/mk/applications',
      message: courseItems.length ? undefined : 'Kurs tafsilotlari hali e’lon qilinmagan. E’lon qilingan materiallar paydo bo‘lganda ushbu sahifada ko‘rsatiladi.',
    };
  }

  async getApplications(actor: AuthUser) {
    return this.prisma.mkApplication.findMany({
      where: { applicantId: actor.id },
      orderBy: { submittedAt: 'desc' },
      include: { exams: { include: { scores: { select: { score: true, submittedAt: true } } } } },
    });
  }

  async listThreads(actor: AuthUser) {
    const threads = await this.prisma.medConversation.findMany({
      where: { OR: [{ participantA: actor.id }, { participantB: actor.id }] },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const participantIds = [...new Set(threads.flatMap((thread) => [thread.participantA, thread.participantB]).filter((id) => id !== actor.id))];
    const participants = await this.prisma.user.findMany({ where: { id: { in: participantIds } }, select: { id: true, fullName: true, registryStatus: true } });
    const byId = new Map(participants.map((participant) => [participant.id, participant]));
    return threads.map((thread) => ({ ...thread, messages: thread.messages.reverse(), otherParticipant: byId.get(thread.participantA === actor.id ? thread.participantB : thread.participantA) || null }));
  }

  async startThread(actor: AuthUser, dto: StartMediatorThreadDto) {
    const entry = await this.prisma.registryEntry.findFirst({
      where: { id: dto.mediatorRegistryId, type: RegistryType.MEDIATOR, status: RegistryEntryStatus.ACTIVE, publicProfile: true, deletedAt: null },
      select: { id: true, userId: true, fullName: true },
    });
    if (!entry?.userId) throw new NotFoundException('Tanlangan faol ochiq reyestr mediatоri topilmadi yoki kabinetga bog‘lanmagan');
    const mediator = await this.prisma.user.findFirst({ where: { id: entry.userId, status: 'ACTIVE', registryStatus: 'MEDIATOR' }, select: { id: true } });
    if (!mediator || mediator.id === actor.id) throw new BadRequestException('Tanlangan mediator bilan chat ochib bo‘lmaydi');

    const [participantA, participantB] = [actor.id, mediator.id].sort();
    const thread = await this.prisma.medConversation.upsert({
      where: { participantA_participantB: { participantA, participantB } },
      create: { participantA, participantB },
      update: {},
    });
    const message = await this.createMessage(actor.id, thread.id, dto.body, dto.attachmentIds || []);
    return { ...thread, mediator: { id: entry.id, userId: mediator.id, fullName: entry.fullName }, messages: [message] };
  }

  async sendMessage(actor: AuthUser, threadId: string, dto: SendThreadMessageDto) {
    const thread = await this.prisma.medConversation.findFirst({ where: { id: threadId, OR: [{ participantA: actor.id }, { participantB: actor.id }] } });
    if (!thread) throw new NotFoundException('Chat topilmadi');
    return this.createMessage(actor.id, thread.id, dto.body, dto.attachmentIds || []);
  }

  private async createMessage(senderId: string, threadId: string, body: string, attachmentIds: string[]) {
    if (!body.trim() && !attachmentIds.length) throw new BadRequestException('Xabar matni yoki biriktirilgan fayl bo‘lishi kerak');
    if (attachmentIds.length) {
      const ownedFiles = await this.prisma.fileRecord.findMany({ where: { id: { in: attachmentIds }, uploadedById: senderId, accessLevel: 'PRIVATE' }, select: { id: true } });
      if (ownedFiles.length !== new Set(attachmentIds).size) throw new ForbiddenException('Faqat o‘zingiz yuklagan shaxsiy fayllarni chatga biriktirishingiz mumkin');
    }
    const message = await this.prisma.medMessage.create({ data: { conversationId: threadId, senderId, body: body.trim(), attachmentIds: attachmentIds as unknown as Prisma.InputJsonValue } });
    await this.prisma.medConversation.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    return message;
  }
}
