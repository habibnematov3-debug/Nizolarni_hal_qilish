import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { ContentStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    type: string,
    dto: CreateContentDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedType = type.toLowerCase().trim();

    const content = await this.prisma.content.create({
      data: {
        type: normalizedType,
        titleUz: dto.titleUz,
        titleRu: dto.titleRu,
        titleEn: dto.titleEn,
        summaryUz: dto.summaryUz,
        summaryRu: dto.summaryRu,
        summaryEn: dto.summaryEn,
        bodyUz: dto.bodyUz,
        bodyRu: dto.bodyRu,
        bodyEn: dto.bodyEn,
        fileUrl: dto.fileUrl,
        videoUrl: dto.videoUrl,
        status: dto.status || 'DRAFT',
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : (dto.status === 'PUBLISHED' ? new Date() : null),
        authorId: user.id,
        metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'CREATE',
      entityType: `CONTENT_${normalizedType.toUpperCase()}`,
      entityId: content.id,
      newValues: content,
      ipAddress,
      userAgent,
    });

    return content;
  }

  async findAll(type: string, query: QueryContentDto) {
    const normalizedType = type.toLowerCase().trim();
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = {
      type: { equals: normalizedType, mode: 'insensitive' },
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { titleUz: { contains: search, mode: 'insensitive' } },
        { titleRu: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { summaryUz: { contains: search, mode: 'insensitive' } },
        { bodyUz: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      type: normalizedType,
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findPublished(type: string, query: QueryContentDto) {
    return this.findAll(type, { ...query, status: ContentStatus.PUBLISHED });
  }

  async findOne(type: string, id: string) {
    const normalizedType = type.toLowerCase().trim();
    const content = await this.prisma.content.findFirst({
      where: {
        id,
        type: { equals: normalizedType, mode: 'insensitive' },
      },
    });

    if (!content) {
      throw new NotFoundException(`Kontent topilmadi: ${id}`);
    }

    // Increment view count
    await this.prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return content;
  }

  async update(
    type: string,
    id: string,
    dto: UpdateContentDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedType = type.toLowerCase().trim();
    const existing = await this.findOne(normalizedType, id);

    const updated = await this.prisma.content.update({
      where: { id },
      data: {
        ...(dto.titleUz ? { titleUz: dto.titleUz } : {}),
        ...(dto.titleRu !== undefined ? { titleRu: dto.titleRu } : {}),
        ...(dto.titleEn !== undefined ? { titleEn: dto.titleEn } : {}),
        ...(dto.summaryUz !== undefined ? { summaryUz: dto.summaryUz } : {}),
        ...(dto.summaryRu !== undefined ? { summaryRu: dto.summaryRu } : {}),
        ...(dto.summaryEn !== undefined ? { summaryEn: dto.summaryEn } : {}),
        ...(dto.bodyUz !== undefined ? { bodyUz: dto.bodyUz } : {}),
        ...(dto.bodyRu !== undefined ? { bodyRu: dto.bodyRu } : {}),
        ...(dto.bodyEn !== undefined ? { bodyEn: dto.bodyEn } : {}),
        ...(dto.fileUrl !== undefined ? { fileUrl: dto.fileUrl } : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.publishedAt !== undefined ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: dto.status && dto.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: `CONTENT_${normalizedType.toUpperCase()}`,
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async delete(
    type: string,
    id: string,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedType = type.toLowerCase().trim();
    const existing = await this.findOne(normalizedType, id);

    await this.prisma.content.delete({
      where: { id },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'DELETE',
      entityType: `CONTENT_${normalizedType.toUpperCase()}`,
      entityId: id,
      oldValues: existing,
      ipAddress,
      userAgent,
    });

    return { success: true, message: 'Kontent muvaffaqiyatli o\'chirildi' };
  }

  async publish(
    type: string,
    id: string,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedType = type.toLowerCase().trim();
    const existing = await this.findOne(normalizedType, id);

    const updated = await this.prisma.content.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'PUBLISH',
      entityType: `CONTENT_${normalizedType.toUpperCase()}`,
      entityId: id,
      oldValues: { status: existing.status, publishedAt: existing.publishedAt },
      newValues: { status: updated.status, publishedAt: updated.publishedAt },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
