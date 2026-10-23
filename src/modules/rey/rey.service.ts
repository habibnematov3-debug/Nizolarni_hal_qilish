import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ObligationStatus, Prisma, RegistryEntryStatus, RegistryType, ReportStatus } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RatingMethodologyDto } from './dto/rating-methodology.dto';
import { RatingQueryDto } from './dto/rating-query.dto';

const METHODOLOGY_KEY = 'REY_RATING_METHODOLOGY';
const DEFAULT_METHODOLOGY = {
  status: 'DRAFT',
  description: 'Dastlabki taklif. Reyting ko‘rsatkichlari va vaznlari buyurtmachi tomonidan tasdiqlanishi kerak.',
  reportComplianceWeight: 30,
  resolutionRateWeight: 40,
  agreementExecutionWeight: 30,
  updatedAt: null as string | null,
};

type Methodology = typeof DEFAULT_METHODOLOGY;

@Injectable()
export class ReyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReyService.name);
  private scheduleTimeout?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  onModuleInit() {
    if (process.env.VERCEL) return;
    this.scheduleTimeout = setTimeout(async () => {
      try {
        await this.recalculate();
      } catch (error) {
        this.logger.error(`Boshlang‘ich reyting hisoblash amalga oshmadi: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.scheduleNextCalculation();
      }
    }, 30_000);
    this.scheduleTimeout.unref?.();
  }

  onModuleDestroy() {
    if (this.scheduleTimeout) clearTimeout(this.scheduleTimeout);
  }

  async listPublic(query: RatingQueryDto) {
    const periodYear = this.periodYear(query.periodYear);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.RegistryEntryWhereInput = {
      status: RegistryEntryStatus.ACTIVE,
      publicProfile: true,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.region ? { region: { contains: query.region, mode: 'insensitive' } } : {}),
    };
    const [total, entries, methodology] = await Promise.all([
      this.prisma.registryEntry.count({ where }),
      this.prisma.registryEntry.findMany({
        where,
        include: { ratings: { where: { periodYear }, take: 1 } },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      }),
      this.getMethodology(),
    ]);
    const ranked = entries.map((entry) => ({
      profile: this.publicProfileProjection(entry),
      rating: entry.ratings[0] ? this.ratingProjection(entry.ratings[0]) : null,
    }));
    ranked.sort((a, b) => (b.rating?.score ?? -1) - (a.rating?.score ?? -1) ||
      a.profile.fullName.localeCompare(b.profile.fullName, 'uz'));
    return {
      periodYear,
      methodology,
      items: ranked.slice((page - 1) * limit, page * limit),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPublicRating(id: string, requestedYear?: number) {
    const periodYear = this.periodYear(requestedYear);
    const entry = await this.prisma.registryEntry.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
        status: RegistryEntryStatus.ACTIVE,
        publicProfile: true,
        deletedAt: null,
      },
      include: { ratings: { where: { periodYear }, take: 1 } },
    });
    if (!entry) throw new NotFoundException('Ochiq reyestr profili topilmadi');
    return {
      profile: this.publicProfileProjection(entry),
      periodYear,
      rating: entry.ratings[0] ? this.ratingProjection(entry.ratings[0]) : null,
      methodology: await this.getMethodology(),
    };
  }

  async getMethodology() {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: METHODOLOGY_KEY } });
    if (!setting || !setting.value || typeof setting.value !== 'object' || Array.isArray(setting.value)) {
      return DEFAULT_METHODOLOGY;
    }
    return { ...DEFAULT_METHODOLOGY, ...(setting.value as Record<string, unknown>) };
  }

  async updateMethodology(dto: RatingMethodologyDto, actor: AuthUser) {
    const weightSum = dto.reportComplianceWeight + dto.resolutionRateWeight + dto.agreementExecutionWeight;
    if (weightSum !== 100) throw new BadRequestException('Metodika vaznlari yig‘indisi 100 bo‘lishi kerak');
    const previous = await this.getMethodology();
    const value: Methodology = {
      status: 'DRAFT',
      description: dto.description?.trim() || previous.description,
      reportComplianceWeight: dto.reportComplianceWeight,
      resolutionRateWeight: dto.resolutionRateWeight,
      agreementExecutionWeight: dto.agreementExecutionWeight,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.prisma.systemSetting.upsert({
      where: { key: METHODOLOGY_KEY },
      create: { key: METHODOLOGY_KEY, group: 'REY', description: 'Reyting hisoblash metodikasi', value: value as Prisma.InputJsonValue, updatedBy: actor.id },
      update: { value: value as Prisma.InputJsonValue, updatedBy: actor.id },
    });
    await this.audit.log({
      userId: actor.id,
      username: actor.username,
      userFullName: actor.fullName,
      action: 'UPDATE_RATING_METHODOLOGY',
      entityType: 'RATING_METHODOLOGY',
      entityId: saved.id,
      oldValues: previous as Prisma.InputJsonValue,
      newValues: value as Prisma.InputJsonValue,
    });
    return value;
  }

  async recalculate(requestedYear?: number, actor?: AuthUser) {
    const periodYear = this.periodYear(requestedYear);
    const periodStart = new Date(Date.UTC(periodYear, 0, 1));
    const periodEnd = new Date(Date.UTC(periodYear + 1, 0, 1));
    const methodology = await this.getMethodology();
    const entries = await this.prisma.registryEntry.findMany({
      where: { status: RegistryEntryStatus.ACTIVE, deletedAt: null },
      select: { id: true, userId: true, type: true },
    });
    const userIds = [...new Set(entries.map((entry) => entry.userId).filter((id): id is string => Boolean(id)))];
    const [reports, caseOutcomes, obligations] = await Promise.all([
      this.prisma.quarterlyReport.groupBy({
        by: ['mediatorId'],
        where: { mediatorId: { in: userIds }, periodYear, status: { in: [ReportStatus.ACCEPTED, ReportStatus.FORWARDED] } },
        _count: { _all: true },
      }),
      userIds.length
        ? this.prisma.mediationCase.groupBy({
            by: ['mediatorId', 'resultStatus'],
            where: { mediatorId: { in: userIds }, createdAt: { gte: periodStart, lt: periodEnd }, resultStatus: { not: null } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.monitoringObligation.groupBy({
            by: ['mediatorId', 'status'],
            where: { mediatorId: { in: userIds }, dueDate: { gte: periodStart, lt: periodEnd } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const reportsByUser = new Map(reports.map((row) => [row.mediatorId, row._count._all]));
    const outcomesByUser = new Map<string, { settled: number; completed: number }>();
    for (const row of caseOutcomes) {
      if (!row.mediatorId) continue;
      const totals = outcomesByUser.get(row.mediatorId) || { settled: 0, completed: 0 };
      if (row.resultStatus === 'SETTLED') totals.settled += row._count._all;
      totals.completed += row._count._all;
      outcomesByUser.set(row.mediatorId, totals);
    }
    const obligationsByUser = new Map<string, { fulfilled: number; total: number }>();
    for (const row of obligations) {
      if (!row.mediatorId) continue;
      const totals = obligationsByUser.get(row.mediatorId) || { fulfilled: 0, total: 0 };
      totals.total += row._count._all;
      if (row.status === ObligationStatus.COMPLETED) totals.fulfilled += row._count._all;
      obligationsByUser.set(row.mediatorId, totals);
    }

    let calculated = 0;
    for (const entry of entries) {
      const reportsCount = entry.userId ? reportsByUser.get(entry.userId) || 0 : 0;
      const outcome = entry.userId ? outcomesByUser.get(entry.userId) : undefined;
      const obligation = entry.userId ? obligationsByUser.get(entry.userId) : undefined;
      const components = {
        reportCompliance: this.metric(reportsCount, 4),
        resolutionRate: this.metric(outcome?.settled || 0, outcome?.completed || 0),
        agreementExecution: this.metric(obligation?.fulfilled || 0, obligation?.total || 0),
      };
      const weighted = [
        [components.reportCompliance, methodology.reportComplianceWeight],
        [components.resolutionRate, methodology.resolutionRateWeight],
        [components.agreementExecution, methodology.agreementExecutionWeight],
      ] as const;
      const applicableWeight = weighted.reduce((sum, [metric, weight]) => sum + (metric.denominator > 0 ? weight : 0), 0);
      const score = applicableWeight
        ? weighted.reduce((sum, [metric, weight]) => sum + (metric.denominator > 0 ? metric.score * weight : 0), 0) / applicableWeight
        : 0;
      const version = methodology.updatedAt || 'draft-v1';
      await this.prisma.registryRating.upsert({
        where: { registryEntryId_periodYear: { registryEntryId: entry.id, periodYear } },
        create: { registryEntryId: entry.id, periodYear, metrics: components as Prisma.InputJsonValue, score, methodologyVersion: version },
        update: { metrics: components as Prisma.InputJsonValue, score, methodologyVersion: version, calculatedAt: new Date() },
      });
      calculated++;
    }
    if (actor) {
      await this.audit.log({
        userId: actor.id,
        username: actor.username,
        userFullName: actor.fullName,
        action: 'RECALCULATE_PUBLIC_RATINGS',
        entityType: 'REGISTRY_RATING',
        newValues: { periodYear, calculated, methodologyVersion: methodology.updatedAt || 'draft-v1' },
      });
    }
    return { periodYear, calculated, methodologyVersion: methodology.updatedAt || 'draft-v1' };
  }

  private metric(numerator: number, denominator: number) {
    return {
      numerator,
      denominator,
      score: denominator > 0 ? Math.min(100, (numerator / denominator) * 100) : 0,
    };
  }

  private ratingProjection(rating: { score: number; metrics: Prisma.JsonValue; methodologyVersion: string; calculatedAt: Date; periodYear: number }) {
    return {
      score: Math.round(rating.score * 100) / 100,
      metrics: rating.metrics,
      methodologyVersion: rating.methodologyVersion,
      periodYear: rating.periodYear,
      calculatedAt: rating.calculatedAt,
    };
  }

  private publicProfileProjection(entry: { id: string; userId: string | null; fullName: string; type: RegistryType; region: string; photoUrl: string | null; specialization: string[] }) {
    return { id: entry.id, fullName: entry.fullName, type: entry.type, region: entry.region, photoUrl: entry.photoUrl, specialization: entry.specialization };
  }

  private periodYear(value?: number) {
    const year = value ?? new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Reyting yili 2000–2100 oralig‘ida bo‘lishi kerak');
    return year;
  }

  private scheduleNextCalculation() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    this.scheduleTimeout = setTimeout(async () => {
      try {
        await this.recalculate();
      } catch (error) {
        this.logger.error(`Reytingni davriy hisoblash amalga oshmadi: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.scheduleNextCalculation();
      }
    }, next.getTime() - now.getTime());
    this.scheduleTimeout.unref?.();
  }
}
