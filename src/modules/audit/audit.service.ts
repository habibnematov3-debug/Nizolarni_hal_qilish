import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  userId?: string | null;
  username?: string | null;
  userFullName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Immutably create an audit log entry.
   */
  async log(params: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          username: params.username,
          userFullName: params.userFullName,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ? String(params.entityId) : null,
          oldValues: params.oldValues ? (params.oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
          newValues: params.newValues ? (params.newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${error.message}`, error.stack);
      // We don't fail the primary transaction if logging fails, but log error
      return null;
    }
  }

  /**
   * Find audit logs with flexible filtering and pagination.
   */
  async findAll(query: QueryAuditDto) {
    const {
      page = 1,
      limit = 10,
      search,
      userId,
      username,
      action,
      entityType,
      entityId,
      fromDate,
      toDate,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (username) where.username = { contains: username, mode: 'insensitive' };
    if (action) where.action = { equals: action, mode: 'insensitive' };
    if (entityType) where.entityType = { equals: entityType, mode: 'insensitive' };
    if (entityId) where.entityId = entityId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { userFullName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
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
}
