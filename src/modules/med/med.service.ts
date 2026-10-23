import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CertificateDeliveryMethod, MedApplicationStatus, MedApplicationType, MediatorRegistryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CertificateReplacementDto, CreateCalendarEventDto, RegistryRemovalDto, SendMessageDto, UpdatePortfolioDto } from './dto/med.dto';

@Injectable()
export class MedService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async dossier(userId: string) {
    const dossier = await this.prisma.mediatorDossier.findUnique({ where: { mediatorId: userId } });
    if (!dossier) throw new NotFoundException('Mediator portfoliosi topilmadi');
    return dossier;
  }

  private async assertMessagingAllowed(userId: string) {
    const dossier = await this.prisma.mediatorDossier.findUnique({ where: { mediatorId: userId } });
    const blockedStatuses: MediatorRegistryStatus[] = [MediatorRegistryStatus.SUSPENDED, MediatorRegistryStatus.REVOKED];
    if (dossier && blockedStatuses.includes(dossier.registryStatus)) {
      throw new ForbiddenException('Faoliyati to\'xtatilgan yoki reyestrdan chiqarilgan mediator yozishma yubora olmaydi');
    }
  }

  async getPortfolio(user: AuthUser) {
    const dossier = await this.dossier(user.id);
    return { user: { id: user.id, fullName: user.fullName, username: user.username }, dossier };
  }

  async updatePortfolio(user: AuthUser, dto: UpdatePortfolioDto) {
    await this.dossier(user.id);
    const updated = await this.prisma.mediatorDossier.update({
      where: { mediatorId: user.id },
      data: {
        specialization: dto.specialization,
        workExperience: dto.workExperience === undefined ? undefined : dto.workExperience as unknown as Prisma.InputJsonValue,
        achievements: dto.achievements === undefined ? undefined : dto.achievements as unknown as Prisma.InputJsonValue,
        profileBio: dto.profileBio,
        videoUrl: dto.videoUrl,
        media: dto.media as unknown as Prisma.InputJsonValue,
        isPublic: dto.isPublic,
      },
    });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'UPDATE_MED_PORTFOLIO', entityType: 'MEDIATOR_DOSSIER', entityId: updated.id, newValues: dto });
    return updated;
  }

  async listEvents(user: AuthUser, from?: string, to?: string) {
    const eventDate: Prisma.DateTimeFilter = {};
    if (from) eventDate.gte = new Date(from);
    if (to) eventDate.lte = new Date(to);
    return this.prisma.medCalendarEvent.findMany({ where: { userId: user.id, ...(Object.keys(eventDate).length ? { eventDate } : {}) }, orderBy: { eventDate: 'asc' } });
  }

  async createEvent(user: AuthUser, dto: CreateCalendarEventDto) {
    const event = await this.prisma.medCalendarEvent.create({ data: { userId: user.id, title: dto.title, eventDate: new Date(dto.eventDate), notes: dto.notes } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_MED_CALENDAR_EVENT', entityType: 'MED_CALENDAR_EVENT', entityId: event.id, newValues: dto });
    return event;
  }

  async deleteEvent(user: AuthUser, id: string) {
    const event = await this.prisma.medCalendarEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Tadbir topilmadi');
    if (event.userId !== user.id) throw new ForbiddenException('Tadbir sizga tegishli emas');
    return this.prisma.medCalendarEvent.delete({ where: { id } });
  }

  async listApplications(user: AuthUser) {
    return this.prisma.medApplication.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  }

  async createRegistryRemoval(user: AuthUser, dto: RegistryRemovalDto, ipAddress?: string) {
    return this.createApplication(user, { type: MedApplicationType.REGISTRY_REMOVAL, reason: dto.reason }, ipAddress);
  }

  async createCertificateReplacement(user: AuthUser, dto: CertificateReplacementDto, ipAddress?: string) {
    if (dto.deliveryMethod === CertificateDeliveryMethod.POST && !dto.deliveryAddress) throw new BadRequestException('Pochta orqali olish uchun manzil ko\'rsatilishi kerak');
    return this.createApplication(user, { type: MedApplicationType.CERTIFICATE_REPLACEMENT, reason: dto.reason, supportingDocumentId: dto.supportingDocumentId, photoFileId: dto.photoFileId, deliveryMethod: dto.deliveryMethod, deliveryAddress: dto.deliveryAddress }, ipAddress);
  }

  private async createApplication(user: AuthUser, data: Prisma.MedApplicationCreateInput | any, ipAddress?: string) {
    const existing = await this.prisma.medApplication.findFirst({ where: { userId: user.id, type: data.type, status: { in: [MedApplicationStatus.SUBMITTED, MedApplicationStatus.IN_REVIEW] } } });
    if (existing) throw new ConflictException('Ushbu turdagi faol ariza allaqachon mavjud');
    const application = await this.prisma.medApplication.create({ data: { ...data, userId: user.id } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_MED_APPLICATION', entityType: 'MED_APPLICATION', entityId: application.id, newValues: data, ipAddress });
    return application;
  }

  async listMessages(user: AuthUser) {
    const conversations = await this.prisma.medConversation.findMany({ where: { OR: [{ participantA: user.id }, { participantB: user.id }] }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
    return conversations;
  }

  async sendMessage(user: AuthUser, dto: SendMessageDto) {
    await this.assertMessagingAllowed(user.id);
    if (dto.recipientId === user.id) throw new BadRequestException('O\'zingizga xabar yubora olmaysiz');
    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient || recipient.status !== 'ACTIVE') throw new NotFoundException('Qabul qiluvchi topilmadi');
    const [a, b] = [user.id, dto.recipientId].sort();
    const conversation = await this.prisma.medConversation.upsert({ where: { participantA_participantB: { participantA: a, participantB: b } }, create: { participantA: a, participantB: b }, update: {} });
    const message = await this.prisma.medMessage.create({ data: { conversationId: conversation.id, senderId: user.id, body: dto.body, attachmentIds: dto.attachmentIds as unknown as Prisma.InputJsonValue } });
    await this.prisma.medConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return message;
  }
}
