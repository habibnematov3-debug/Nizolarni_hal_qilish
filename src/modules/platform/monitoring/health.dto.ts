import { ApiProperty } from '@nestjs/swagger';

/**
 * Servis holati DTO
 */
export class ServiceStatusDto {
  @ApiProperty({ example: 'healthy', enum: ['healthy', 'degraded', 'unhealthy'] })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ example: 45, description: 'Javob vaqti (ms)' })
  responseTimeMs: number;

  @ApiProperty({ example: 'Ma\'lumotlar bazasi ulangan', required: false })
  message?: string;
}

/**
 * Tizim salomatligi holati DTO
 */
export class HealthStatusDto {
  @ApiProperty({ example: 'healthy', enum: ['healthy', 'degraded', 'unhealthy'] })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ example: '2026-10-22T18:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: '1d 2h 30m' })
  uptime: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: ServiceStatusDto })
  api: ServiceStatusDto;

  @ApiProperty({ type: ServiceStatusDto })
  database: ServiceStatusDto;

  @ApiProperty({ type: ServiceStatusDto })
  scheduler: ServiceStatusDto;
}

/**
 * Tizim metrikalar DTO
 */
export class MetricsDto {
  @ApiProperty({ example: 1250, description: 'Jami so\'rovlar soni' })
  totalRequests: number;

  @ApiProperty({ example: 45.5, description: 'O\'rtacha javob vaqti (ms)' })
  avgResponseTimeMs: number;

  @ApiProperty({ example: 12, description: 'Xatoliklar soni' })
  errorCount: number;

  @ApiProperty({ example: 238, description: 'Faol ulanishlar' })
  activeConnections: number;

  @ApiProperty({ example: 75.2, description: 'Xotira ishlatilishi (%)' })
  memoryUsagePercent: number;

  @ApiProperty({ example: 12.5, description: 'CPU ishlatilishi (%)' })
  cpuUsagePercent: number;

  @ApiProperty({ example: '2026-10-22T18:00:00Z' })
  collectedAt: string;
}

/**
 * Log yozuvi DTO
 */
export class LogEntryDto {
  @ApiProperty({ example: 'INFO', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'] })
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

  @ApiProperty({ example: 'Foydalanuvchi tizimga kirdi' })
  message: string;

  @ApiProperty({ example: 'AuthService', required: false })
  context?: string;

  @ApiProperty({ example: '2026-10-22T18:00:00Z' })
  timestamp: string;

  @ApiProperty({ required: false })
  metadata?: Record<string, any>;
}

/**
 * Loglar ro'yxati DTO
 */
export class LogsResponseDto {
  @ApiProperty({ type: [LogEntryDto] })
  logs: LogEntryDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;
}
