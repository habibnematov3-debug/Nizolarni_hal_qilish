import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-roles.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, currentUser: AuthUser, ipAddress?: string, userAgent?: string) {
    // Check if username, email or phone is already taken
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.username === dto.username) throw new ConflictException('Ushbu username band');
      if (dto.email && existing.email === dto.email) throw new ConflictException('Ushbu email band');
      if (dto.phone && existing.phone === dto.phone) throw new ConflictException('Ushbu telefon raqami band');
    }

    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new BadRequestException('Ko\'rsatilgan tashkilot topilmadi');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Resolve roles
    let roleRecords: { id: string; name: string }[] = [];
    if (dto.roleNames && dto.roleNames.length > 0) {
      roleRecords = await this.prisma.role.findMany({
        where: {
          OR: [
            { name: { in: dto.roleNames } },
            { id: { in: dto.roleNames } },
          ],
        },
      });
    }

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          fullName: dto.fullName,
          passwordHash,
          email: dto.email,
          phone: dto.phone,
          pinfl: dto.pinfl,
          position: dto.position,
          organizationId: dto.organizationId,
          status: dto.status || 'ACTIVE',
        },
      });

      if (roleRecords.length > 0) {
        await tx.userRole.createMany({
          data: roleRecords.map((r) => ({
            userId: user.id,
            roleId: r.id,
          })),
        });
      }

      return user;
    });

    const result = await this.findOne(newUser.id);

    // Audit log
    await this.auditService.log({
      userId: currentUser.id,
      username: currentUser.username,
      userFullName: currentUser.fullName,
      action: 'CREATE',
      entityType: 'USER',
      entityId: newUser.id,
      newValues: {
        username: result.username,
        fullName: result.fullName,
        organizationId: result.organizationId,
        roles: result.roles,
        status: result.status,
      },
      ipAddress,
      userAgent,
    });

    return result;
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, status, organizationId, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (status) where.status = status;
    if (organizationId) where.organizationId = organizationId;
    if (role) {
      where.userRoles = {
        some: {
          role: {
            OR: [
              { name: { equals: role, mode: 'insensitive' } },
              { displayName: { contains: role, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { pinfl: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true, type: true } },
          userRoles: {
            include: {
              role: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items = users.map((u) => {
      const { passwordHash, userRoles, ...safeUser } = u;
      return {
        ...safeUser,
        roles: userRoles.map((ur) => ur.role),
      };
    });

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
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Foydalanuvchi topilmadi: ${id}`);
    }

    const { passwordHash, userRoles, ...safeUser } = user;
    const roles = userRoles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    return {
      ...safeUser,
      roles,
      permissions,
      roleDetails: userRoles.map((ur) => ur.role),
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.findOne(id);

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.fullName) updateData.fullName = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.pinfl !== undefined) updateData.pinfl = dto.pinfl;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.status) updateData.status = dto.status;

    if (dto.organizationId !== undefined) {
      if (dto.organizationId) {
        const org = await this.prisma.organization.findUnique({
          where: { id: dto.organizationId },
        });
        if (!org) throw new BadRequestException('Ko\'rsatilgan tashkilot topilmadi');
        updateData.organization = { connect: { id: dto.organizationId } };
      } else {
        updateData.organization = { disconnect: true };
      }
    }

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // If roleNames specified in update, update roles too
    if (dto.roleNames) {
      await this.assignRoles(id, { roles: dto.roleNames }, currentUser, ipAddress, userAgent);
    }

    const updated = await this.findOne(id);

    // Audit log
    await this.auditService.log({
      userId: currentUser.id,
      username: currentUser.username,
      userFullName: currentUser.fullName,
      action: dto.status && dto.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'USER',
      entityId: id,
      oldValues: {
        fullName: existing.fullName,
        email: existing.email,
        phone: existing.phone,
        organizationId: existing.organizationId,
        status: existing.status,
      },
      newValues: {
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        organizationId: updated.organizationId,
        status: updated.status,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async assignRoles(
    id: string,
    dto: AssignUserRolesDto,
    currentUser: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.findOne(id);

    // Find requested roles
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [
          { name: { in: dto.roles } },
          { id: { in: dto.roles } },
        ],
      },
    });

    const oldRoles = user.roles;

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((r) => ({
            userId: id,
            roleId: r.id,
          })),
        });
      }
    });

    const updated = await this.findOne(id);

    // Audit log explicitly for role assignment requirement FT-ADM-03 / ADM-02
    await this.auditService.log({
      userId: currentUser.id,
      username: currentUser.username,
      userFullName: currentUser.fullName,
      action: 'ROLE_ASSIGN',
      entityType: 'USER',
      entityId: id,
      oldValues: { roles: oldRoles },
      newValues: { roles: updated.roles },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
