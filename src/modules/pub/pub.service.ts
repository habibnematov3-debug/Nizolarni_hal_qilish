import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PublicContentQueryDto, PublicPreferenceDto } from './dto/pub.dto';

const PUBLIC_TYPES = new Set(['news', 'legal_framework', 'templates', 'faq', 'manuals', 'video_manuals', 'announcements']);

@Injectable()
export class PubService {
  constructor(private readonly prisma: PrismaService, private readonly contentService: ContentService) {}

  async home(language = 'uz') {
    const [news, announcements, statistics] = await Promise.all([
      this.prisma.content.findMany({ where: { type: 'news', status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' }, take: 5 }),
      this.prisma.content.findMany({ where: { type: 'announcements', status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' }, take: 5 }),
      this.statistics(),
    ]);
    return { language, news, announcements, statistics, blocks: ['news', 'mediators', 'legal_framework', 'statistics', 'map'] };
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

  async mediators(search?: string, region?: string, specialization?: string) {
    const where: Prisma.UserWhereInput = { registryStatus: 'MEDIATOR', status: 'ACTIVE', dossier: { is: { isPublic: true } } };
    if (search) where.OR = [{ fullName: { contains: search, mode: 'insensitive' } }, { address: { contains: search, mode: 'insensitive' } }];
    const users = await this.prisma.user.findMany({ where, include: { dossier: true, organization: true }, orderBy: { fullName: 'asc' } });
    return users.filter((user) => !region || user.dossier?.region === region || user.organization?.region === region).filter((user) => !specialization || user.dossier?.specialization.includes(specialization)).map((user) => ({ id: user.id, fullName: user.fullName, region: user.dossier?.region || user.organization?.region, specialization: user.dossier?.specialization || [], experience: user.dossier?.workExperience, achievements: user.dossier?.achievements, videoUrl: user.dossier?.videoUrl }));
  }

  async statistics() {
    const [mediators, applicants, dossiers] = await Promise.all([
      this.prisma.user.count({ where: { registryStatus: 'MEDIATOR', status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { registryStatus: 'NONE', status: 'ACTIVE' } }),
      this.prisma.mediatorDossier.findMany({ where: { registryStatus: 'ACTIVE' }, select: { region: true } }),
    ]);
    const byRegion: Record<string, number> = {};
    for (const dossier of dossiers) byRegion[dossier.region] = (byRegion[dossier.region] || 0) + 1;
    return { mediators, applicants, activeMediatorDossiers: dossiers.length, byRegion };
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
