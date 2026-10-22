import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { QueryDictionaryDto } from './dto/query-dictionary.dto';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class DictionariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getCategories() {
    const categories = await this.prisma.dictionaryItem.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    return categories.map((c) => ({
      category: c.category,
      totalCount: c._count.id,
    }));
  }

  async findItems(category: string, query: QueryDictionaryDto) {
    const { page = 1, limit = 50, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DictionaryItemWhereInput = {
      category: { equals: category, mode: 'insensitive' },
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { nameUz: { contains: search, mode: 'insensitive' } },
        { nameRu: { contains: search, mode: 'insensitive' } },
        { nameEn: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.dictionaryItem.count({ where }),
      this.prisma.dictionaryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      category,
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(category: string, id: string) {
    const item = await this.prisma.dictionaryItem.findFirst({
      where: {
        id,
        category: { equals: category, mode: 'insensitive' },
      },
    });

    if (!item) {
      throw new NotFoundException(`Spravochnik yozuvi topilmadi: ${id}`);
    }

    return item;
  }

  async create(
    category: string,
    dto: CreateDictionaryItemDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedCategory = category.toLowerCase().trim();

    const existing = await this.prisma.dictionaryItem.findUnique({
      where: {
        category_code: {
          category: normalizedCategory,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`"${dto.code}" kodi ushbu spravochnikda allaqachon mavjud`);
    }

    const item = await this.prisma.dictionaryItem.create({
      data: {
        category: normalizedCategory,
        code: dto.code,
        nameUz: dto.nameUz,
        nameRu: dto.nameRu,
        nameEn: dto.nameEn,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata ?? Prisma.JsonNull,
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'CREATE',
      entityType: `DICTIONARY_${normalizedCategory.toUpperCase()}`,
      entityId: item.id,
      newValues: item,
      ipAddress,
      userAgent,
    });

    return item;
  }

  async update(
    category: string,
    id: string,
    dto: UpdateDictionaryItemDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const normalizedCategory = category.toLowerCase().trim();
    const existing = await this.findOne(normalizedCategory, id);

    if (dto.code && dto.code !== existing.code) {
      const conflict = await this.prisma.dictionaryItem.findUnique({
        where: {
          category_code: {
            category: normalizedCategory,
            code: dto.code,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(`"${dto.code}" kodi ushbu spravochnikda allaqachon mavjud`);
      }
    }

    const updated = await this.prisma.dictionaryItem.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code } : {}),
        ...(dto.nameUz ? { nameUz: dto.nameUz } : {}),
        ...(dto.nameRu !== undefined ? { nameRu: dto.nameRu } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: dto.isActive !== undefined && dto.isActive !== existing.isActive ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: `DICTIONARY_${normalizedCategory.toUpperCase()}`,
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
