import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateNotificationTemplateDto } from '../dto/update-template.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getAllTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getTemplateById(id: string) {
    const template = await this.prisma.notificationTemplate.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!template) {
      throw new NotFoundException(`Xabar shabloni topilmadi: ${id}`);
    }

    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateNotificationTemplateDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.getTemplateById(id);

    const updated = await this.prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.titleUz ? { titleUz: dto.titleUz } : {}),
        ...(dto.titleRu !== undefined ? { titleRu: dto.titleRu } : {}),
        ...(dto.bodyUz ? { bodyUz: dto.bodyUz } : {}),
        ...(dto.bodyRu !== undefined ? { bodyRu: dto.bodyRu } : {}),
        ...(dto.smsTextUz !== undefined ? { smsTextUz: dto.smsTextUz } : {}),
        ...(dto.smsTextRu !== undefined ? { smsTextRu: dto.smsTextRu } : {}),
        ...(dto.availableVariables !== undefined
          ? { availableVariables: dto.availableVariables as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    // Audit log (FT-BIL-03 / BIL-02)
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'UPDATE_TEMPLATE',
      entityType: 'NOTIFICATION_TEMPLATE',
      entityId: existing.code,
      oldValues: {
        name: existing.name,
        titleUz: existing.titleUz,
        bodyUz: existing.bodyUz,
        smsTextUz: existing.smsTextUz,
        isActive: existing.isActive,
      },
      newValues: {
        name: updated.name,
        titleUz: updated.titleUz,
        bodyUz: updated.bodyUz,
        smsTextUz: updated.smsTextUz,
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
