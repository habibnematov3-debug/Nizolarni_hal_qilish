import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Audit yozuvi interfeysi
 * Har bir muhim amal uchun yoziladigan ma'lumotlar
 */
export interface AuditEntry {
  /** Amalni bajargan foydalanuvchi ID */
  userId: string;
  /** Amal nomi: CREATE, UPDATE, DELETE, LOGIN, LOGOUT va h.k. */
  action: string;
  /** Ob'ekt turi: USER, ORGANIZATION, CONTENT va h.k. */
  entity: string;
  /** Ob'ekt ID */
  entityId: string;
  /** O'zgarishdan oldingi qiymat */
  oldValue?: Record<string, any>;
  /** O'zgarishdan keyingi qiymat */
  newValue?: Record<string, any>;
  /** Amal vaqti */
  timestamp: Date;
  /** So'rov yuborilgan IP manzil */
  ip: string;
  /** Qo'shimcha ma'lumotlar */
  metadata?: Record<string, any>;
}

/**
 * Audit hisoboti interfeysi
 */
export interface AuditReport {
  /** Hisobot davri boshlanishi */
  from: Date;
  /** Hisobot davri tugashi */
  to: Date;
  /** Jami yozuvlar soni */
  totalEntries: number;
  /** Amallar bo'yicha statistika */
  actionStats: Record<string, number>;
  /** Ob'ektlar bo'yicha statistika */
  entityStats: Record<string, number>;
  /** Eng faol foydalanuvchilar */
  topUsers: Array<{ userId: string; count: number }>;
  /** Hisobot yaratilgan vaqt */
  generatedAt: Date;
}

/**
 * Platform Audit Xizmati Interfeysi
 */
export interface IPlatformAuditService {
  record(entry: AuditEntry): Promise<void>;
  getHistory(entityId: string, entityType: string): Promise<AuditEntry[]>;
  generateReport(from: Date, to: Date): Promise<AuditReport>;
}

/**
 * Platform Audit Xizmati
 *
 * Tizimda amalga oshirilgan barcha muhim amallarni yozib boradi.
 * Yozuvlar immutable — bir marta yozilgandan keyin o'zgartirilmaydi.
 * AuditImmutableGuard orqali himoyalangan.
 */
@Injectable()
export class PlatformAuditService implements IPlatformAuditService {
  private readonly logger = new Logger(PlatformAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Audit yozuvi qo'shish (o'zgartirib bo'lmaydi)
   * @param entry - Audit yozuvi ma'lumotlari
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      // Parollar va tokenlarni mask qilish
      const sanitizedNewValue = this.maskSensitiveFields(entry.newValue);
      const sanitizedOldValue = this.maskSensitiveFields(entry.oldValue);

      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entity,
          entityId: entry.entityId,
          oldValues: sanitizedOldValue ?? undefined,
          newValues: sanitizedNewValue ?? undefined,
          ipAddress: entry.ip,
          createdAt: entry.timestamp,
        },
      });

      this.logger.log(
        `Audit yozildi: [${entry.action}] ${entry.entity}#${entry.entityId} — Foydalanuvchi: ${entry.userId}`,
      );
    } catch (error) {
      // Audit xatosi asosiy jarayonni to'xtatmasligi kerak
      this.logger.error(
        `Audit yozishda xato: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Ob'ekt o'zgarishlar tarixini olish
   * @param entityId - Ob'ekt ID
   * @param entityType - Ob'ekt turi
   */
  async getHistory(entityId: string, entityType: string): Promise<AuditEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        entityId,
        entityType,
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      userId: log.userId ?? '',
      action: log.action,
      entity: log.entityType,
      entityId: log.entityId ?? '',
      oldValue: log.oldValues as Record<string, any> | undefined,
      newValue: log.newValues as Record<string, any> | undefined,
      timestamp: log.createdAt,
      ip: log.ipAddress ?? '',
      metadata: undefined,
    }));
  }

  /**
   * Audit hisobotini generatsiya qilish
   * @param from - Hisobot davri boshlanishi
   * @param to - Hisobot davri tugashi
   */
  async generateReport(from: Date, to: Date): Promise<AuditReport> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
    });

    // Amallar bo'yicha statistika
    const actionStats: Record<string, number> = {};
    const entityStats: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    for (const log of logs) {
      actionStats[log.action] = (actionStats[log.action] || 0) + 1;
      entityStats[log.entityType] = (entityStats[log.entityType] || 0) + 1;
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    }

    // Eng faol foydalanuvchilar (top 10)
    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      from,
      to,
      totalEntries: logs.length,
      actionStats,
      entityStats,
      topUsers,
      generatedAt: new Date(),
    };
  }

  /**
   * Maxfiy maydonlarni maskalash (parol, token, secret)
   */
  private maskSensitiveFields(
    obj?: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!obj) return undefined;

    const sensitiveKeys = [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'privateKey',
    ];

    const masked = { ...obj };
    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        masked[key] = '***MASKED***';
      }
    }
    return masked;
  }
}
