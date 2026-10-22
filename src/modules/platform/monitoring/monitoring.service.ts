import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { HealthStatusDto, MetricsDto, LogEntryDto } from './health.dto';

/**
 * Monitoring xizmati interfeysi
 */
export interface IMonitoringService {
  getHealthStatus(): Promise<HealthStatusDto>;
  getMetrics(): Promise<MetricsDto>;
  logCentralized(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void;
  getLogs(page: number, limit: number): Promise<{ logs: LogEntryDto[]; total: number }>;
}

/**
 * Markazlashgan Monitoring Xizmati
 * API, DB va scheduler holatlarini kuzatadi
 * So'rovlar soni va javob vaqtlarini o'lchaydi
 */
@Injectable()
export class MonitoringService implements IMonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly startTime = Date.now();

  /** In-memory metrikalar (real loyihada Redis yoki Prometheus ishlatiladi) */
  private metrics = {
    totalRequests: 0,
    totalResponseTimeMs: 0,
    errorCount: 0,
    activeConnections: 0,
  };

  /** In-memory loglar (real loyihada ELK Stack yoki CloudWatch ishlatiladi) */
  private readonly logBuffer: LogEntryDto[] = [];
  private readonly MAX_LOG_BUFFER = 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tizim salomatligi holatini tekshirish
   * API, DB va scheduler statuslarini qaytaradi
   */
  async getHealthStatus(): Promise<HealthStatusDto> {
    const now = Date.now();

    // API holati
    const apiStatus = {
      status: 'healthy' as const,
      responseTimeMs: Date.now() - now,
      message: 'API ishlamoqda',
    };

    // DB holati
    const dbStatus = await this.checkDatabaseHealth();

    // Scheduler holati (hozircha oddiy check)
    const schedulerStatus = {
      status: 'healthy' as const,
      responseTimeMs: 0,
      message: 'Scheduler faol',
    };

    // Umumiy holat
    const overallStatus = [apiStatus.status, dbStatus.status, schedulerStatus.status].includes(
      'unhealthy',
    )
      ? 'unhealthy'
      : [apiStatus.status, dbStatus.status, schedulerStatus.status].includes('degraded')
        ? 'degraded'
        : 'healthy';

    const uptimeMs = Date.now() - this.startTime;
    const uptimeStr = this.formatUptime(uptimeMs);

    return {
      status: overallStatus as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: uptimeStr,
      version: process.env.npm_package_version || '1.0.0',
      api: apiStatus,
      database: dbStatus,
      scheduler: schedulerStatus,
    };
  }

  /**
   * Tizim ko'rsatkichlarini olish
   * So'rovlar soni, javob vaqti, xotira va CPU ishlatilishini qaytaradi
   */
  async getMetrics(): Promise<MetricsDto> {
    const memUsage = process.memoryUsage();
    const totalMemMB = memUsage.heapTotal / 1024 / 1024;
    const usedMemMB = memUsage.heapUsed / 1024 / 1024;
    const memoryUsagePercent = totalMemMB > 0 ? (usedMemMB / totalMemMB) * 100 : 0;

    const avgResponseTimeMs =
      this.metrics.totalRequests > 0
        ? this.metrics.totalResponseTimeMs / this.metrics.totalRequests
        : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
      errorCount: this.metrics.errorCount,
      activeConnections: this.metrics.activeConnections,
      memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
      cpuUsagePercent: 0, // Real loyihada os-utils yoki prom-client ishlatiladi
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Markazlashgan loglash
   * @param level - Log darajasi: DEBUG, INFO, WARN, ERROR
   * @param message - Log xabari
   * @param context - Log konteksti (masalan, servis nomi)
   * @param metadata - Qo'shimcha ma'lumotlar
   */
  logCentralized(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const entry: LogEntryDto = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Bufferga qo'shish (eng eski yozuvni o'chirish)
    if (this.logBuffer.length >= this.MAX_LOG_BUFFER) {
      this.logBuffer.shift();
    }
    this.logBuffer.push(entry);

    // NestJS Logger orqali chiqarish
    switch (level) {
      case 'DEBUG':
        this.logger.debug(message, context);
        break;
      case 'INFO':
        this.logger.log(message, context);
        break;
      case 'WARN':
        this.logger.warn(message, context);
        break;
      case 'ERROR':
        this.logger.error(message, undefined, context);
        break;
    }
  }

  /**
   * Loglar ro'yxatini olish
   * @param page - Sahifa raqami
   * @param limit - Sahifadagi yozuvlar soni
   */
  async getLogs(
    page: number = 1,
    limit: number = 50,
  ): Promise<{ logs: LogEntryDto[]; total: number }> {
    const total = this.logBuffer.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    // Eng yangi loglarni birinchi ko'rsatish
    const reversedLogs = [...this.logBuffer].reverse();
    const logs = reversedLogs.slice(start, end);

    return { logs, total };
  }

  /**
   * So'rov metrikasini yangilash (interceptor tomonidan chaqiriladi)
   */
  recordRequest(responseTimeMs: number, isError: boolean = false): void {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTimeMs += responseTimeMs;
    if (isError) {
      this.metrics.errorCount++;
    }
  }

  /**
   * Ma'lumotlar bazasi holatini tekshirish
   */
  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTimeMs: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        responseTimeMs: Date.now() - start,
        message: 'Ma\'lumotlar bazasi ulangan',
      };
    } catch (error) {
      this.logger.error('DB health check muvaffaqiyatsiz', error);
      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'Ma\'lumotlar bazasi ulanmadi',
      };
    }
  }

  /**
   * Uptime-ni o'qilishi oson formatga o'tkazish
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || '< 1m';
  }
}
