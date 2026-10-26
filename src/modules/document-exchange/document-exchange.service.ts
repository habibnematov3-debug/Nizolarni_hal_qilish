import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentExchangeAction,
  DocumentExchangeStatus,
  DocumentExchangeType,
  OrganizationType,
  Prisma,
} from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDocumentExchangeMessageDto,
  CreateInteragencyExchangeDto,
  DocumentExchangeActionDto,
  DocumentExchangeQueryDto,
} from './dto/document-exchange.dto';

const OFFICE_ROLES = ['REGIONAL_STAFF', 'MINISTRY_STAFF'];
const CASE_ROLES = ['TALABGOR', 'MEDIATOR'];

@Injectable()
export class DocumentExchangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthUser, query: DocumentExchangeQueryDto) {
    const folder = query.folder || 'ALL';
    const search = query.search?.trim();
    const officeRole = user.roles.some((role) => OFFICE_ROLES.includes(role));
    let threads: any[] = [];

    if (officeRole) {
      const organization = await this.assertOfficeOrganization(user);
      const where: Prisma.DocumentExchangeThreadWhereInput = {
        type: DocumentExchangeType.INTERAGENCY,
        participants: { some: { organizationId: organization.id } },
        ...(folder === 'INBOX'
          ? { targetOrganizationId: organization.id }
          : folder === 'OUTBOX'
            ? { NOT: { targetOrganizationId: organization.id } }
            : {}),
        ...(search ? { subject: { contains: search, mode: 'insensitive' } } : {}),
      };
      threads = await this.prisma.documentExchangeThread.findMany({
        where,
        include: this.threadInclude(),
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    } else {
      if (!user.roles.some((role) => CASE_ROLES.includes(role))) {
        throw new ForbiddenException('Hujjat almashinuvi kabineti uchun ruxsat yo‘q');
      }
      const mediationWhere: Prisma.MediationCaseWhereInput = {
        OR: [
          { initiatedById: user.id },
          { mediatorId: user.id },
          { participants: { some: { userId: user.id } } },
          ...(user.pinfl ? [{ participants: { some: { pinfl: user.pinfl } } }] : []),
        ],
      };
      const cases = await this.prisma.mediationCase.findMany({ where: mediationWhere, select: { id: true } });
      const caseThreadIds: string[] = [];
      for (const item of cases) {
        const thread = await this.ensureMediationThread(user, item.id);
        caseThreadIds.push(thread.id);
      }
      const where: Prisma.DocumentExchangeThreadWhereInput = {
        OR: [
          ...(caseThreadIds.length ? [{ id: { in: caseThreadIds } }] : []),
          {
            type: DocumentExchangeType.INTERAGENCY,
            participants: { some: { userId: user.id } },
            ...(folder === 'INBOX'
              ? { targetOrganizationId: '__NO_INBOX_FOR_PERSONAL_USER__' }
              : folder === 'OUTBOX'
                ? { createdById: user.id }
                : {}),
          },
        ],
        ...(search ? { subject: { contains: search, mode: 'insensitive' } } : {}),
      };
      threads = await this.prisma.documentExchangeThread.findMany({
        where,
        include: this.threadInclude(),
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });
    }

    return threads.map((thread) => this.projectThread(thread));
  }

  async getMediationThread(user: AuthUser, mediationId: string) {
    const thread = await this.ensureMediationThread(user, mediationId);
    return this.getThread(user, thread.id);
  }

  async sendMediationMessage(user: AuthUser, mediationId: string, dto: CreateDocumentExchangeMessageDto, ipAddress?: string) {
    const thread = await this.ensureMediationThread(user, mediationId);
    return this.createMessage(user, thread.id, dto, ipAddress);
  }

  async createInteragency(user: AuthUser, dto: CreateInteragencyExchangeDto, ipAddress?: string) {
    if (!user.roles.includes('MEDIATOR')) {
      throw new ForbiddenException('Hududiy adliya organiga hujjatni mediator yuborishi mumkin');
    }

    let region = user.region?.trim();
    if (dto.relatedMediationId) {
      const mediation = await this.getAccessibleMediation(user, dto.relatedMediationId);
      region = mediation.region || region;
    }
    if (!region) throw new BadRequestException('Mediator profilida hudud ko‘rsatilmagan');

    const regionalOrganization = await this.prisma.organization.findFirst({
      where: {
        type: OrganizationType.REGIONAL_DEPARTMENT,
        status: 'ACTIVE',
        region: { equals: region, mode: 'insensitive' },
      },
      select: { id: true, name: true, region: true },
    });
    if (!regionalOrganization) {
      throw new NotFoundException(`${region} bo‘yicha faol hududiy adliya tashkiloti topilmadi`);
    }

    const fileIds = await this.assertOwnedFiles(user, dto.attachmentIds || []);
    const thread = await this.prisma.documentExchangeThread.create({
      data: {
        type: DocumentExchangeType.INTERAGENCY,
        status: DocumentExchangeStatus.SUBMITTED,
        subject: dto.subject.trim(),
        region,
        relatedMediationId: dto.relatedMediationId,
        targetOrganizationId: regionalOrganization.id,
        createdById: user.id,
        participants: {
          create: [
            { userId: user.id },
            { organizationId: regionalOrganization.id },
          ],
        },
        messages: {
          create: {
            senderId: user.id,
            action: DocumentExchangeAction.SUBMITTED,
            body: dto.body.trim(),
            attachments: { create: fileIds.map((fileId) => ({ fileId })) },
          },
        },
      },
      include: this.threadInclude(),
    });

    await this.audit.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'DOCUMENT_EXCHANGE_SUBMITTED',
      entityType: 'DOCUMENT_EXCHANGE',
      entityId: thread.id,
      newValues: { subject: thread.subject, targetOrganizationId: regionalOrganization.id, relatedMediationId: dto.relatedMediationId },
      ipAddress,
    });
    await this.notifyThread(thread.id, user.id, `Yangi hujjat kelib tushdi: ${thread.subject}`);
    return this.projectThread(thread);
  }

  async getThread(user: AuthUser, id: string) {
    const thread = await this.findThread(id);
    await this.assertThreadAccess(user, thread);
    if (thread.type === DocumentExchangeType.MEDIATION) {
      await this.ensureMediationParticipants(thread.id, thread.mediationId!);
      return this.projectThread(await this.findThread(id));
    }
    return this.projectThread(thread);
  }

  async sendMessage(user: AuthUser, id: string, dto: CreateDocumentExchangeMessageDto, ipAddress?: string) {
    return this.createMessage(user, id, dto, ipAddress);
  }

  async act(user: AuthUser, id: string, dto: DocumentExchangeActionDto, ipAddress?: string) {
    const thread = await this.findThread(id);
    await this.assertThreadAccess(user, thread);
    if (thread.type !== DocumentExchangeType.INTERAGENCY) {
      throw new BadRequestException('Bu amal faqat idoralararo hujjat oqimida bajariladi');
    }
    if (!user.roles.some((role) => OFFICE_ROLES.includes(role))) {
      throw new ForbiddenException('Hujjat holatini faqat vakolatli idora xodimi o‘zgartiradi');
    }
    const organization = await this.assertOfficeOrganization(user);
    if (thread.targetOrganizationId !== organization.id) {
      throw new ForbiddenException('Hujjat hozir boshqa tashkilot ko‘rib chiqishida');
    }

    const note = dto.note?.trim();
    let status: DocumentExchangeStatus;
    let action: DocumentExchangeAction;
    let body = note || '';

    switch (dto.action) {
      case 'RECEIVE':
        if (![DocumentExchangeStatus.SUBMITTED, DocumentExchangeStatus.FORWARDED].includes(thread.status)) {
          throw new ConflictException('Hujjat qabul qilinadigan holatda emas');
        }
        status = DocumentExchangeStatus.IN_REVIEW;
        action = DocumentExchangeAction.RECEIVED;
        body ||= 'Hujjat ko‘rib chiqish uchun qabul qilindi.';
        break;
      case 'REQUEST_CORRECTION':
        if (!note) throw new BadRequestException('Tuzatish so‘rovining sababi yozilishi kerak');
        status = DocumentExchangeStatus.NEEDS_CORRECTION;
        action = DocumentExchangeAction.REQUESTED_CORRECTION;
        body = note;
        break;
      case 'FORWARD_TO_MINISTRY': {
        if (!user.roles.includes('REGIONAL_STAFF') || organization.type !== OrganizationType.REGIONAL_DEPARTMENT) {
          throw new ForbiddenException('Vazirlikka hujjatni faqat hududiy adliya organi yo‘naltiradi');
        }
        const ministry = await this.prisma.organization.findFirst({
          where: { type: OrganizationType.MINISTRY, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!ministry) throw new NotFoundException('Faol vazirlik tashkiloti topilmadi');
        await this.prisma.documentExchangeParticipant.upsert({
          where: { threadId_organizationId: { threadId: id, organizationId: ministry.id } },
          create: { threadId: id, organizationId: ministry.id },
          update: {},
        });
        status = DocumentExchangeStatus.FORWARDED;
        action = DocumentExchangeAction.FORWARDED_TO_MINISTRY;
        body ||= note || 'Hududiy adliya organi hujjatni vazirlikka yo‘naltirdi.';
        await this.prisma.documentExchangeThread.update({ where: { id }, data: { targetOrganizationId: ministry.id } });
        break;
      }
      case 'COMPLETE':
        if (thread.status === DocumentExchangeStatus.COMPLETED || thread.status === DocumentExchangeStatus.REJECTED) {
          throw new ConflictException('Hujjat oqimi allaqachon yakunlangan');
        }
        status = DocumentExchangeStatus.COMPLETED;
        action = DocumentExchangeAction.COMPLETED;
        body ||= 'Hujjat bilan ishlash yakunlandi.';
        break;
      case 'REJECT':
        if (!note) throw new BadRequestException('Rad etish sababi yozilishi kerak');
        status = DocumentExchangeStatus.REJECTED;
        action = DocumentExchangeAction.REJECTED;
        body = note;
        break;
    }

    await this.prisma.documentExchangeThread.update({ where: { id }, data: { status } });
    await this.prisma.documentExchangeMessage.create({ data: { threadId: id, senderId: user.id, action, body } });
    await this.audit.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: `DOCUMENT_EXCHANGE_${dto.action}`,
      entityType: 'DOCUMENT_EXCHANGE',
      entityId: id,
      newValues: { status, note: note || undefined },
      ipAddress,
    });
    await this.notifyThread(id, user.id, `${thread.subject}: ${body}`);
    return this.getThread(user, id);
  }

  private async createMessage(user: AuthUser, id: string, dto: CreateDocumentExchangeMessageDto, ipAddress?: string) {
    const thread = await this.findThread(id);
    await this.assertThreadAccess(user, thread);
    if (thread.status === DocumentExchangeStatus.COMPLETED || thread.status === DocumentExchangeStatus.REJECTED) {
      throw new ConflictException('Yakunlangan hujjat oqimiga yangi xabar yuborib bo‘lmaydi');
    }
    const body = dto.body?.trim() || '';
    const fileIds = await this.assertOwnedFiles(user, dto.attachmentIds || []);
    if (!body && !fileIds.length) throw new BadRequestException('Xabar matni yoki hujjat biriktiring');

    let status: DocumentExchangeStatus | undefined;
    let action = DocumentExchangeAction.MESSAGE;
    if (thread.type === DocumentExchangeType.INTERAGENCY && !user.roles.some((role) => OFFICE_ROLES.includes(role))) {
      status = DocumentExchangeStatus.SUBMITTED;
      action = DocumentExchangeAction.SUBMITTED;
    }

    const message = await this.prisma.documentExchangeMessage.create({
      data: {
        threadId: id,
        senderId: user.id,
        action,
        body: body || 'Hujjat biriktirildi.',
        attachments: { create: fileIds.map((fileId) => ({ fileId })) },
      },
    });
    if (status) await this.prisma.documentExchangeThread.update({ where: { id }, data: { status } });
    await this.audit.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'DOCUMENT_EXCHANGE_MESSAGE_SENT',
      entityType: 'DOCUMENT_EXCHANGE',
      entityId: id,
      newValues: { messageId: message.id, attachmentCount: fileIds.length },
      ipAddress,
    });
    await this.notifyThread(id, user.id, `Yangi xabar: ${thread.subject}`);
    return this.getThread(user, id);
  }

  private async ensureMediationThread(user: AuthUser, mediationId: string) {
    if (!user.roles.some((role) => CASE_ROLES.includes(role))) {
      throw new ForbiddenException('Mediatsiya hujjatlari fuqaro yoki mediator kabinetida ochiladi');
    }
    const mediation = await this.getAccessibleMediation(user, mediationId);
    const thread = await this.prisma.documentExchangeThread.upsert({
      where: { mediationId },
      create: {
        type: DocumentExchangeType.MEDIATION,
        subject: `Mediatsiya hujjatlari · ${mediation.disputeSubject}`,
        region: mediation.region,
        mediationId,
        createdById: mediation.initiatedById,
      },
      update: {},
    });
    await this.ensureMediationParticipants(thread.id, mediationId);
    return thread;
  }

  private async ensureMediationParticipants(threadId: string, mediationId: string) {
    const mediation = await this.prisma.mediationCase.findUnique({
      where: { id: mediationId },
      select: { initiatedById: true, mediatorId: true, participants: { select: { userId: true } } },
    });
    if (!mediation) throw new NotFoundException('Mediatsiya ishi topilmadi');
    const userIds = [...new Set([
      mediation.initiatedById,
      mediation.mediatorId,
      ...mediation.participants.map((participant) => participant.userId),
    ].filter((id): id is string => Boolean(id)))];
    if (userIds.length) {
      await this.prisma.documentExchangeParticipant.createMany({
        data: userIds.map((userId) => ({ threadId, userId })),
        skipDuplicates: true,
      });
    }
  }

  private async getAccessibleMediation(user: AuthUser, mediationId: string) {
    const mediation = await this.prisma.mediationCase.findUnique({
      where: { id: mediationId },
      include: { participants: true },
    });
    if (!mediation) throw new NotFoundException('Mediatsiya ishi topilmadi');
    const allowed = mediation.initiatedById === user.id || mediation.mediatorId === user.id ||
      mediation.participants.some((participant) => participant.userId === user.id || (!!user.pinfl && participant.pinfl === user.pinfl));
    if (!allowed) throw new ForbiddenException('Ushbu mediatsiya ishi hujjatlarini ko‘rish huquqi yo‘q');
    return mediation;
  }

  private async findThread(id: string) {
    const thread = await this.prisma.documentExchangeThread.findUnique({ where: { id }, include: this.threadInclude() });
    if (!thread) throw new NotFoundException('Hujjat almashinuvi yozuvi topilmadi');
    return thread;
  }

  private async assertThreadAccess(user: AuthUser, thread: any) {
    if (thread.type === DocumentExchangeType.MEDIATION) {
      if (!thread.mediationId) throw new NotFoundException('Mediatsiya ishi topilmadi');
      await this.getAccessibleMediation(user, thread.mediationId);
      return;
    }
    const isParticipant = thread.participants.some((participant: any) =>
      participant.userId === user.id ||
      (OFFICE_ROLES.some((role) => user.roles.includes(role)) && participant.organizationId === user.organizationId),
    );
    if (!isParticipant) throw new ForbiddenException('Hujjat almashinuvi yozuviga kirish huquqi yo‘q');
  }

  private async assertOfficeOrganization(user: AuthUser) {
    if (!user.organizationId || !user.roles.some((role) => OFFICE_ROLES.includes(role))) {
      throw new ForbiddenException('Hududiy yoki vazirlik tashkiloti bilan bog‘langan xodim hisobi kerak');
    }
    const organization = await this.prisma.organization.findFirst({
      where: { id: user.organizationId, status: 'ACTIVE' },
      select: { id: true, name: true, type: true, region: true },
    });
    if (!organization) throw new ForbiddenException('Faol tashkilot biriktirilmagan');
    if (user.roles.includes('REGIONAL_STAFF')) {
      if (organization.type !== OrganizationType.REGIONAL_DEPARTMENT) {
        throw new ForbiddenException('Hududiy xodim hududiy adliya tashkilotiga biriktirilgan bo‘lishi kerak');
      }
      if (user.region && organization.region && user.region.toLocaleLowerCase() !== organization.region.toLocaleLowerCase()) {
        throw new ForbiddenException('Xodim profili va tashkilot hududi mos emas');
      }
    }
    if (user.roles.includes('MINISTRY_STAFF') && organization.type !== OrganizationType.MINISTRY) {
      throw new ForbiddenException('Vazirlik xodimi vazirlik tashkilotiga biriktirilgan bo‘lishi kerak');
    }
    return organization;
  }

  private async assertOwnedFiles(user: AuthUser, fileIds: string[]) {
    const uniqueIds = [...new Set(fileIds)];
    if (uniqueIds.length !== fileIds.length) throw new BadRequestException('Bir xil faylni qayta biriktirib bo‘lmaydi');
    if (!uniqueIds.length) return [];
    const files = await this.prisma.fileRecord.findMany({
      where: { id: { in: uniqueIds }, uploadedById: user.id, accessLevel: 'PRIVATE' },
      select: { id: true },
    });
    if (files.length !== uniqueIds.length) {
      throw new ForbiddenException('Faqat o‘zingiz yuklagan shaxsiy hujjatlarni biriktirishingiz mumkin');
    }
    return uniqueIds;
  }

  private threadInclude(): Prisma.DocumentExchangeThreadInclude {
    return {
      targetOrganization: { select: { id: true, name: true, type: true, region: true } },
      relatedMediation: { select: { id: true, disputeSubject: true, region: true } },
      createdBy: { select: { id: true, fullName: true } },
      participants: {
        include: {
          user: { select: { id: true, fullName: true } },
          organization: { select: { id: true, name: true, type: true } },
        },
      },
      messages: {
        include: {
          sender: { select: { id: true, fullName: true } },
          attachments: { include: { file: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      },
    };
  }

  private projectThread(thread: any) {
    return {
      id: thread.id,
      type: thread.type,
      status: thread.status,
      subject: thread.subject,
      region: thread.region,
      mediationId: thread.mediationId,
      relatedMediation: thread.relatedMediation,
      targetOrganization: thread.targetOrganization,
      createdBy: thread.createdBy,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messages: thread.messages.map((message: any) => ({
        id: message.id,
        action: message.action,
        body: message.body,
        sender: message.sender,
        createdAt: message.createdAt,
        attachments: message.attachments.map((attachment: any) => attachment.file),
      })),
    };
  }

  private async notifyThread(threadId: string, senderId: string, content: string) {
    const thread = await this.prisma.documentExchangeThread.findUnique({
      where: { id: threadId },
      select: { subject: true, targetOrganizationId: true, participants: { select: { userId: true, organizationId: true } } },
    });
    if (!thread) return;
    const recipientIds = new Set(thread.participants.map((participant) => participant.userId).filter((id): id is string => Boolean(id) && id !== senderId));
    const organizationIds = [...new Set(thread.participants.map((participant) => participant.organizationId).filter((id): id is string => Boolean(id)))];
    if (organizationIds.length) {
      const staff = await this.prisma.user.findMany({
        where: {
          organizationId: { in: organizationIds },
          status: 'ACTIVE',
          userRoles: { some: { role: { name: { in: OFFICE_ROLES } } } },
        },
        select: { id: true },
        take: 100,
      });
      for (const member of staff) if (member.id !== senderId) recipientIds.add(member.id);
    }
    for (const userId of recipientIds) {
      try {
        await this.notifications.send({
          userId,
          templateCode: 'APPLICATION_STATUS',
          variables: { title: 'Hujjat almashinuvi', content },
          idempotencyKey: `document-exchange-${threadId}-${userId}-${Date.now()}`,
          channels: ['CABINET'] as any,
        });
      } catch {
        // The exchange is persisted even if a notification provider is temporarily unavailable.
      }
    }
  }
}
