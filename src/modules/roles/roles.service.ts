import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateRolePermissionsDto } from './dto/update-permissions.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol topilmadi: ${id}`);
    }

    return role;
  }

  async updatePermissions(
    id: string,
    dto: UpdateRolePermissionsDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const role = await this.findOne(id);

    // Find permissions matching codes or IDs
    const permissions = await this.prisma.permission.findMany({
      where: {
        OR: [
          { code: { in: dto.permissionCodes } },
          { id: { in: dto.permissionCodes } },
        ],
      },
    });

    const oldPermissionCodes = role.permissions.map((p) => p.permission.code);

    // Replace permissions in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
        });
      }
    });

    const updatedRole = await this.findOne(id);
    const newPermissionCodes = updatedRole.permissions.map((p) => p.permission.code);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'UPDATE_PERMISSIONS',
      entityType: 'ROLE',
      entityId: id,
      oldValues: { permissions: oldPermissionCodes },
      newValues: { permissions: newPermissionCodes },
      ipAddress,
      userAgent,
    });

    return updatedRole;
  }
}
