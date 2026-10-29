import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ObligationStatus, OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateObligationDto, ObligationQueryDto } from './dto/mon.dto';

@Injectable()
export class MonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonService.name);
  private reminderTimer?: NodeJS.Timeout;
  private startupReminderTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    this.startupReminderTimer = setTimeout(() => void this.runScheduledReminderCycle(), 30_000);
    this.reminderTimer = setInterval(() => void this.runScheduledReminderCycle(), 60 * 60 * 1000);
    this.startupReminderTimer.unref?.();
    this.reminderTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.startupReminderTimer) clearTimeout(this.startupReminderTimer);
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  private async runScheduledReminderCycle() {
    try { await this.runReminderCycle() }
    catch (error) { this.logger.error(`Majburiyat eslatmalarini yuborish amalga oshmadi: ${error instanceof Error ? error.message : String(error)}`) }
  }

  async create(user: AuthUser, dto: CreateObligationDto, ipAddress?: string) {
    const dueDate = new Date(dto.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('Muddat noto\'g\'ri');
    if (dto.responsiblePartyOrganizationTin) {
      const relatedCase = await this.prisma.mediationCase.findFirst({
        where: { id: dto.agreementId, mediatorId: user.id, participants: { some: { organizationTin: dto.responsiblePartyOrganizationTin } } },
        select: { id: true },
      });
      if (!relatedCase) throw new ForbiddenException('Tashkilot majburiyatini faqat shu mediatsiyaning biriktirilgan mediatori qayd etishi mumkin');
    }
    const obligation = await this.prisma.monitoringObligation.create({ data: {
      agreementId: dto.agreementId, description: dto.description, dueDate, responsiblePartyId: dto.responsiblePartyId, responsiblePartyPinfl: dto.responsiblePartyPinfl, responsiblePartyOrganizationTin: dto.responsiblePartyOrganizationTin,
      responsiblePartyName: dto.responsiblePartyName, mediatorId: dto.mediatorId || user.id, region: dto.region || user.region,
      reminderDaysBefore: dto.reminderDaysBefore ?? 3, reminderIntervalDays: dto.reminderIntervalDays ?? 1, createdById: user.id,
    } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_MON_OBLIGATION', entityType: 'MON_OBLIGATION', entityId: obligation.id, newValues: dto, ipAddress });
    return obligation;
  }

  async list(user: AuthUser, query: ObligationQueryDto) {
    const where: Prisma.MonitoringObligationWhereInput = await this.accessWhere(user, query);
    if (query.status && Object.values(ObligationStatus).includes(query.status as ObligationStatus)) where.status = query.status as ObligationStatus;
    return this.prisma.monitoringObligation.findMany({ where, orderBy: { dueDate: 'asc' } });
  }

  private async accessWhere(user: AuthUser, query: ObligationQueryDto): Promise<Prisma.MonitoringObligationWhereInput> {
    const isStaff = user.roles.some((role) => ['REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN'].includes(role));
    const where: Prisma.MonitoringObligationWhereInput = {};
    if (!isStaff) {
      const organizationTins = await this.getBusinessOrganizationTins(user);
      where.OR = [{ responsiblePartyId: user.id }, ...(user.pinfl ? [{ responsiblePartyPinfl: user.pinfl }] : []), ...(organizationTins.length ? [{ responsiblePartyOrganizationTin: { in: organizationTins } }] : []), { mediatorId: user.id }, { createdById: user.id }];
    }
    if (query.agreementId) where.agreementId = query.agreementId;
    if (query.mediatorId) where.mediatorId = query.mediatorId;
    if (query.region) where.region = query.region;
    if (user.roles.includes('REGIONAL_STAFF') && user.region) where.region = user.region;
    return where;
  }

  async complete(user: AuthUser, id: string, ipAddress?: string) {
    const item = await this.prisma.monitoringObligation.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Majburiyat topilmadi');
    const organizationTins = await this.getBusinessOrganizationTins(user);
    const canComplete = item.responsiblePartyId === user.id || (!!user.pinfl && item.responsiblePartyPinfl === user.pinfl) || (!!item.responsiblePartyOrganizationTin && organizationTins.includes(item.responsiblePartyOrganizationTin)) || item.mediatorId === user.id || item.createdById === user.id || user.roles.includes('ADMIN');
    if (!canComplete) throw new ForbiddenException('Bu majburiyatni belgilash huquqi yo\'q');
    if (item.status === ObligationStatus.COMPLETED) return item;
    const updated = await this.prisma.monitoringObligation.update({ where: { id }, data: { status: ObligationStatus.COMPLETED, completedAt: new Date(), completedById: user.id } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'COMPLETE_MON_OBLIGATION', entityType: 'MON_OBLIGATION', entityId: id, ipAddress });
    return updated;
  }

  async statistics(user: AuthUser, query: ObligationQueryDto) {
    const items = await this.prisma.monitoringObligation.findMany({ where: await this.accessWhere(user, query), select: { status: true, region: true, mediatorId: true } });
    const byStatus: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const byMediator: Record<string, number> = {};
    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      const region = item.region || 'Noma\'lum';
      byRegion[region] = (byRegion[region] || 0) + 1;
      const mediator = item.mediatorId || 'Noma\'lum';
      byMediator[mediator] = (byMediator[mediator] || 0) + 1;
    }
    return { total: items.length, completed: byStatus.COMPLETED || 0, incomplete: items.length - (byStatus.COMPLETED || 0), byStatus, byRegion, byMediator };
  }

  async runReminderCycle() {
    const now = new Date();
    const active = await this.prisma.monitoringObligation.findMany({ where: { status: { not: ObligationStatus.COMPLETED } } });
    let notified = 0;
    for (const item of active) {
      const dueSoonAt = new Date(item.dueDate.getTime() - item.reminderDaysBefore * 86400000);
      const nextReminderAt = item.lastReminderAt ? new Date(item.lastReminderAt.getTime() + item.reminderIntervalDays * 86400000) : null;
      const nextStatus = item.dueDate < now ? ObligationStatus.OVERDUE : now >= dueSoonAt ? ObligationStatus.DUE_SOON : ObligationStatus.PENDING;
      await this.prisma.monitoringObligation.update({ where: { id: item.id }, data: { status: nextStatus } });
      if (now < dueSoonAt || (nextReminderAt && now < nextReminderAt)) continue;
      const recipients = new Set([item.responsiblePartyId, item.mediatorId].filter((id): id is string => Boolean(id)));
      if (item.responsiblePartyOrganizationTin) {
        const organization = await this.prisma.organization.findFirst({
          where: { type: OrganizationType.BUSINESS, status: 'ACTIVE', code: item.responsiblePartyOrganizationTin },
          select: { businessMembers: { select: { userId: true } } },
        });
        organization?.businessMembers.forEach((member) => recipients.add(member.userId));
      }
      for (const userId of recipients) {
        await this.notifications.send({ userId, templateCode: 'OBLIGATION_EXECUTION_DEADLINE', variables: { obligationId: item.id, deadline: item.dueDate.toISOString(), status: nextStatus, content: `Majburiyat muddati: ${item.dueDate.toLocaleDateString('uz-UZ')}` }, idempotencyKey: `mon-${item.id}-${item.reminderCount + 1}-${userId}`, channels: ['CABINET', 'SMS'] as any });
        notified += 1;
      }
      await this.prisma.monitoringObligation.update({ where: { id: item.id }, data: { lastReminderAt: now, reminderCount: { increment: 1 } } });
    }
    return { processed: active.length, notified };
  }

  private async getBusinessOrganizationTins(user: AuthUser) {
    if (!user.roles.includes('BUSINESS')) return [];
    const memberships = await this.prisma.businessOrganizationMember.findMany({
      where: { userId: user.id, organization: { type: OrganizationType.BUSINESS, status: 'ACTIVE', code: { not: null } } },
      select: { organization: { select: { code: true } } },
    });
    return memberships.map((membership) => membership.organization.code).filter((code): code is string => Boolean(code));
  }
}
