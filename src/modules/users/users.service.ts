import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-roles.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { resolveUserCabinetAndRoles } from '../auth/helpers/cabinet-resolver.helper';
import { Prisma, RegistryStatus } from '@prisma/client';
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
          ...(dto.pinfl ? [{ pinfl: dto.pinfl }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.username === dto.username) throw new ConflictException('Ushbu username band');
      if (dto.email && existing.email === dto.email) throw new ConflictException('Ushbu email band');
      if (dto.phone && existing.phone === dto.phone) throw new ConflictException('Ushbu telefon raqami band');
      if (dto.pinfl && existing.pinfl === dto.pinfl) throw new ConflictException('Ushbu JShShIR ga ega foydalanuvchi mavjud');
    }

    if (dto.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new BadRequestException('Ko\'rsatilgan tashkilot topilmadi');
      }
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null;

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

    const roleNamesList = roleRecords.map((r) => r.name);
    const resolved = resolveUserCabinetAndRoles(roleNamesList, dto.registryStatus || RegistryStatus.NONE);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          fullName: dto.fullName,
          passwordHash,
          email: dto.email,
          phone: dto.phone,
          pinfl: dto.pinfl,
          passportSeriesNumber: dto.passportSeriesNumber,
          address: dto.address,
          position: dto.position,
          organizationId: dto.organizationId,
          registryStatus: dto.registryStatus || RegistryStatus.NONE,
          cabinetType: resolved.cabinetType,
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
        cabinetType: result.cabinetType,
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
          organization: { select: { id: true, name: true, type: true, region: true } },
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
      const { passwordHash, refreshToken, userRoles, ...safeUser } = u;
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

    const { passwordHash, refreshToken, userRoles, ...safeUser } = user;
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
    if (dto.passportSeriesNumber !== undefined) updateData.passportSeriesNumber = dto.passportSeriesNumber;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.position !== undefined) updateData.position = dto.position;
    if (dto.status) updateData.status = dto.status;
    if (dto.registryStatus) {
      updateData.registryStatus = dto.registryStatus;
      const resolved = resolveUserCabinetAndRoles(existing.roles, dto.registryStatus);
      updateData.cabinetType = resolved.cabinetType;
    }

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
    const newRoleNames = roles.map((r) => r.name);
    const ministryRoleAssignment = currentUser.roles.includes('MINISTRY_STAFF') && !currentUser.roles.includes('ADMIN');
    if (ministryRoleAssignment) {
      const protectedTarget = oldRoles.some((role) => ['ADMIN', 'MINISTRY_STAFF'].includes(role));
      const allowedStaffRoles = new Set(['REGIONAL_STAFF', 'COMMISSION']);
      const changesOutsideStaffScope = newRoleNames.some((role) => !allowedStaffRoles.has(role) && !oldRoles.includes(role))
        || oldRoles.some((role) => !allowedStaffRoles.has(role) && !newRoleNames.includes(role));
      if (protectedTarget || changesOutsideStaffScope) {
        throw new ForbiddenException('Vazirlik xodimi faqat hududiy adliya va malaka komissiyasi xodimi rollarini biriktirishi mumkin');
      }
    }
    const resolved = resolveUserCabinetAndRoles(newRoleNames, user.registryStatus);

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

      await tx.user.update({
        where: { id },
        data: { cabinetType: resolved.cabinetType },
      });
    });

    const updated = await this.findOne(id);

    // Audit log
    await this.auditService.log({
      userId: currentUser.id,
      username: currentUser.username,
      userFullName: currentUser.fullName,
      action: 'ROLE_ASSIGN',
      entityType: 'USER',
      entityId: id,
      oldValues: { roles: oldRoles, cabinetType: user.cabinetType },
      newValues: { roles: updated.roles, cabinetType: updated.cabinetType },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Shaxsiy ma'lumotlar (Obyektivka)ni olish (FT-AUTH-05 / AUTH-04 / GET /users/me)
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const { passwordHash, refreshToken, userRoles, ...safeUser } = user;
    const roles = userRoles.map((ur) => ur.role.name);
    const resolved = resolveUserCabinetAndRoles(roles, user.registryStatus);

    const permissions = Array.from(
      new Set(
        userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    return {
      ...safeUser,
      cabinetType: resolved.cabinetType,
      primaryRole: resolved.primaryRole,
      roles: resolved.roles,
      permissions,
      // Metadata defining which fields are editable vs read-only
      fieldPermissions: {
        editable: ['phone', 'email', 'address'],
        readOnly: [
          'pinfl',
          'passportSeriesNumber',
          'passportGivenDate',
          'passportExpireDate',
          'fullName',
          'birthDate',
          'birthPlace',
          'nationality',
          'gender',
          'registryStatus',
          'cabinetType',
        ],
      },
    };
  }

  /**
   * Ruxsat etilgan maydonlarni tahrirlash (FT-AUTH-05 / AUTH-04 / PATCH /users/me)
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    currentUser: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Check if user attempted to modify Gov-protected fields
    const rawDto = dto as any;
    const protectedFields = [
      'pinfl',
      'passportSeriesNumber',
      'passportGivenDate',
      'passportExpireDate',
      'fullName',
      'birthDate',
      'birthPlace',
      'nationality',
      'gender',
      'registryStatus',
      'cabinetType',
    ];

    for (const field of protectedFields) {
      if (rawDto[field] !== undefined && rawDto[field] !== user[field as keyof typeof user]) {
        throw new BadRequestException(
          `"${field}" maydoni davlat axborot tizimlaridan (ONE ID / IIV) olingan va tahrirlanmaydi`,
        );
      }
    }

    // Validate unique email/phone if changed
    if (dto.email && dto.email !== user.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (emailConflict) throw new ConflictException('Ushbu elektron pochta boshqa foydalanuvchida mavjud');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const phoneConflict = await this.prisma.user.findFirst({
        where: { phone: dto.phone, id: { not: userId } },
      });
      if (phoneConflict) throw new ConflictException('Ushbu telefon raqami boshqa foydalanuvchida mavjud');
    }

    const oldValues = {
      phone: user.phone,
      email: user.email,
      address: user.address,
    };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
      },
    });

    const newValues = {
      phone: updated.phone,
      email: updated.email,
      address: updated.address,
    };

    // Audit log (FT-AUTH-05 / AUTH-04: Tahrirlash audit jurnaliga yoziladi)
    await this.auditService.log({
      userId: currentUser.id,
      username: currentUser.username,
      userFullName: currentUser.fullName,
      action: 'UPDATE',
      entityType: 'USER_PROFILE',
      entityId: userId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    });

    return this.getProfile(userId);
  }
}
