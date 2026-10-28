import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PublicContentQueryDto, PublicPreferenceDto } from './dto/pub.dto';

const PUBLIC_TYPES = new Set(['news', 'legal_framework', 'templates', 'faq', 'manuals', 'video_manuals', 'announcements', 'mandatory_mediation']);

@Injectable()
export class PubService {
  constructor(private readonly prisma: PrismaService, private readonly contentService: ContentService) {}

  async home(language = 'uz') {
    const [news, announcements, statistics] = await Promise.all([
      this.prisma.content.findMany({ where: { type: 'news', status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' }, take: 5 }),
      this.prisma.content.findMany({ where: { type: 'announcements', status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' }, take: 5 }),
      this.statistics(),
    ]);
    return { language, news, announcements, statistics, blocks: ['adr_routes', 'news', 'announcements', 'mediators', 'ratings', 'statistics', 'map', 'mandatory_mediation', 'legal_framework', 'templates', 'manuals', 'video_manuals', 'faq'] };
  }

  async listPublished(type: string, query: PublicContentQueryDto) {
    const normalized = type.toLowerCase().trim();
    if (!PUBLIC_TYPES.has(normalized)) return { type: normalized, items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 10;
    const where: Prisma.ContentWhereInput = { type: normalized, status: ContentStatus.PUBLISHED };
    if (query.search) where.OR = [{ titleUz: { contains: query.search, mode: 'insensitive' } }, { titleRu: { contains: query.search, mode: 'insensitive' } }, { titleEn: { contains: query.search, mode: 'insensitive' } }];
    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { publishedAt: 'desc' } }),
    ]);
    return { type: normalized, language: query.language || 'uz', items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getPublished(type: string, id: string) {
    const normalized = type.toLowerCase().trim();
    const item = await this.prisma.content.findFirst({ where: { id, type: normalized, status: ContentStatus.PUBLISHED } });
    if (!item) throw new NotFoundException('Nashr qilingan kontent topilmadi');
    await this.prisma.content.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return item;
  }

  async statistics() {
    const publicEntryWhere = { status: 'ACTIVE' as const, publicProfile: true, deletedAt: null };
    const [mediators, applicants, dossiers, judges, arbitrators, mediationCases, settledCases, mandatoryCases, regions] = await Promise.all([
      this.prisma.user.count({ where: { registryStatus: 'MEDIATOR', status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { registryStatus: 'NONE', status: 'ACTIVE' } }),
      this.prisma.mediatorDossier.findMany({ where: { registryStatus: 'ACTIVE' }, select: { region: true } }),
      this.prisma.registryEntry.count({ where: { ...publicEntryWhere, type: 'ARBITRATION_JUDGE' } }),
      this.prisma.registryEntry.count({ where: { ...publicEntryWhere, type: 'ARBITRATOR' } }),
      this.prisma.mediationCase.count(),
      this.prisma.mediationCase.count({ where: { status: 'SETTLED' } }),
      this.prisma.mediationCase.count({ where: { type: 'MANDATORY' } }),
      this.prisma.registryEntry.groupBy({ by: ['region'], where: { ...publicEntryWhere, type: 'MEDIATOR' }, _count: { _all: true } }),
    ]);
    const byRegion: Record<string, number> = {};
    for (const region of regions) byRegion[region.region] = region._count._all;
    const publicMediators = Object.values(byRegion).reduce((sum, count) => sum + count, 0);
    return {
      mediators,
      applicants,
      activeMediatorDossiers: dossiers.length,
      byRegion,
      publicSpecialistsTotal: publicMediators + judges + arbitrators,
      registryByType: { MEDIATOR: publicMediators, ARBITRATION_JUDGE: judges, ARBITRATOR: arbitrators },
      mediationCasesTotal: mediationCases,
      mediationCasesSettled: settledCases,
      mandatoryMediationCases: mandatoryCases,
      generatedAt: new Date().toISOString(),
    };
  }

  async getPreferences(visitorId: string) { return this.prisma.publicPreference.upsert({ where: { visitorId }, create: { visitorId }, update: {} }); }

  async updatePreferences(visitorId: string, dto: PublicPreferenceDto) {
    return this.prisma.publicPreference.upsert({ where: { visitorId }, create: { visitorId, ...dto }, update: { ...dto } });
  }

  async activeAnnouncements() { return this.prisma.content.findMany({ where: { type: 'announcements', status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' } }); }

  async acknowledge(user: AuthUser, announcementId: string) {
    const announcement = await this.prisma.content.findFirst({ where: { id: announcementId, type: 'announcements', status: ContentStatus.PUBLISHED } });
    if (!announcement) throw new NotFoundException('E\'lon topilmadi');
    return this.prisma.announcementAcknowledgement.upsert({ where: { announcementId_userId: { announcementId, userId: user.id } }, create: { announcementId, userId: user.id }, update: { acknowledgedAt: new Date() } });
  }

  async pendingAnnouncements(user: AuthUser) {
    const announcements = await this.activeAnnouncements();
    const acknowledged = await this.prisma.announcementAcknowledgement.findMany({ where: { userId: user.id, announcementId: { in: announcements.map((item) => item.id) } }, select: { announcementId: true } });
    const ids = new Set(acknowledged.map((item) => item.announcementId));
    return announcements.filter((item) => !ids.has(item.id));
  }
}
