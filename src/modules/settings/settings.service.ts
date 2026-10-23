import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getAllSettings() {
    const settings = await this.prisma.systemSetting.findMany();

    const result: Record<string, any> = {
      timers: {
        caseRegistrationDays: 3,
        mediatorAssignmentDays: 5,
        mediationProcessMaxDays: 30,
        agreementExecutionConfirmationDays: 10,
      },
      fileLimits: {
        maxFileSizeMb: 25,
        allowedExtensions: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip'],
        maxFilesCount: 10,
      },
      notifications: [
        {
          code: 'CASE_REGISTERED',
          smsTemplate: 'Arizangiz muvaffaqiyatli qabul qilindi. Ariza raqami: {{caseNumber}}',
          emailTemplate: 'Hurmatli {{fullName}}, sizning {{caseNumber}}-sonli arizangiz ro\'yxatga olindi.',
        },
        {
          code: 'MEDIATOR_ASSIGNED',
          smsTemplate: 'Sizning arizangizga mediator {{mediatorName}} biriktirildi.',
          emailTemplate: 'Sizning {{caseNumber}}-sonli arizangiz bo\'yicha mediator {{mediatorName}} biriktirildi. Bog\'lanish: {{mediatorPhone}}',
        },
      ],
      general: {
        platformName: '«Nizolarni muqobil hal etish» elektron platformasi',
        supportPhone: '1008',
        supportEmail: 'support@adliya.uz',
      },
      paymentSettings: {
        examFeeAmount: process.env.MK_EXAM_FEE_AMOUNT ? Number(process.env.MK_EXAM_FEE_AMOUNT) : null,
        examFeeBeneficiaryName: null,
        examFeeBeneficiaryAccount: null,
        examFeeBeneficiaryBankCode: null,
        examFeeBeneficiaryRegion: null,
      },
    };

    for (const s of settings) {
      result[s.key] = s.value;
    }

    return result;
  }

  async updateSettings(
    dto: UpdateSettingsDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const oldSettings = await this.getAllSettings();

    const updates: { key: string; group: string; value: any; description: string }[] = [];

    if (dto.timers) {
      updates.push({
        key: 'timers',
        group: 'TIMERS',
        value: dto.timers,
        description: 'Taymer muddatlari sozlamalari',
      });
    }

    if (dto.fileLimits) {
      updates.push({
        key: 'fileLimits',
        group: 'FILE_LIMITS',
        value: dto.fileLimits,
        description: 'Fayl hajmi va formati cheklovlari',
      });
    }

    if (dto.notifications) {
      updates.push({
        key: 'notifications',
        group: 'NOTIFICATIONS',
        value: dto.notifications,
        description: 'Xabarnomalar shablonlari',
      });
    }

    if (dto.general) {
      updates.push({
        key: 'general',
        group: 'GENERAL',
        value: dto.general,
        description: 'Tizimning umumiy sozlamalari',
      });
    }

    if (dto.paymentSettings) {
      updates.push({
        key: 'paymentSettings',
        group: 'PAYMENTS',
        value: dto.paymentSettings,
        description: 'Imtihon to‘lovi miqdori va oluvchi tashkilot rekvizitlari',
      });
    }

    await this.prisma.$transaction(
      updates.map((item) =>
        this.prisma.systemSetting.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            group: item.group,
            value: item.value as Prisma.InputJsonValue,
            description: item.description,
            updatedBy: user.username,
          },
          update: {
            value: item.value as Prisma.InputJsonValue,
            updatedBy: user.username,
          },
        }),
      ),
    );

    const newSettings = await this.getAllSettings();

    // Audit log
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'UPDATE_SETTINGS',
      entityType: 'SETTINGS',
      entityId: 'SYSTEM_SETTINGS',
      oldValues: oldSettings,
      newValues: newSettings,
      ipAddress,
      userAgent,
    });

    return newSettings;
  }
}
