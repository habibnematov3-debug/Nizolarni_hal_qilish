import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateOrganizationDto, user: AuthUser, ipAddress?: string, userAgent?: string) {
    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Ko\'rsatilgan yuqori tashkilot topilmadi');
      }
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        parentId: dto.parentId || null,
        region: dto.region,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        status: dto.status || 'ACTIVE',
      },
      include: {
        parent: true,
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'CREATE',
      entityType: 'ORGANIZATION',
      entityId: org.id,
      newValues: org,
      ipAddress,
      userAgent,
    });

    return org;
  }

  async findAll(query: QueryOrganizationDto) {
    const { page = 1, limit = 10, search, type, status, region, parentId, asTree } = query;

    if (asTree) {
      // Return hierarchy tree starting from top level (parentId = null)
      const rootOrgs = await this.prisma.organization.findMany({
        where: {
          parentId: null,
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return rootOrgs;
    }

    const skip = (page - 1) * limit;
    const where: Prisma.OrganizationWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (parentId !== undefined) where.parentId = parentId === 'null' ? null : parentId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: { select: { id: true, name: true, type: true } },
          _count: { select: { children: true, users: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Tashkilot topilmadi: ${id}`);
    }

    return org;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.findOne(id);

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Tashkilot o\'z-o\'ziga yuqori tashkilot bo\'la olmaydi');
    }

    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Ko\'rsatilgan yuqori tashkilot topilmadi');
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: dto,
      include: {
        parent: true,
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: dto.status && dto.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'ORGANIZATION',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
