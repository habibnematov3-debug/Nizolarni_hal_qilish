import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Monitoring
import { MonitoringService } from './monitoring/monitoring.service';
import { MonitoringController } from './monitoring/monitoring.controller';
import { MaintenanceService } from './monitoring/maintenance.service';

// Audit
import { PlatformAuditService } from './audit/platform-audit.service';
import { AuditImmutableGuard } from './audit/audit-immutable.guard';

// Fayl saqlash
import { FileStorageService } from './files/file-storage.service';
import { FileStorageController } from './files/file-storage.controller';

// Xavfsizlik
import { SecurityMiddleware } from './security/security.middleware';
import { SecretsService } from './security/secrets.service';

/**
 * Platform Moduli
 *
 * Barcha platforma infratuzilmasi xizmatlarini birlashtiradi:
 * - Monitoring va health check
 * - Kengaytirilgan audit xizmati
 * - Fayl saqlash xizmati
 * - Xavfsizlik middleware va sirlar boshqaruvi
 */
@Module({
  imports: [
    // Fayl yuklash uchun Multer konfiguratsiya (xotira storage)
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  providers: [
    // Monitoring
    MonitoringService,
    MaintenanceService,

    // Platform Audit
    PlatformAuditService,
    AuditImmutableGuard,

    // Fayl saqlash
    FileStorageService,

    // Xavfsizlik
    SecretsService,
  ],
  controllers: [
    MonitoringController,
    FileStorageController,
  ],
  exports: [
    MonitoringService,
    MaintenanceService,
    PlatformAuditService,
    FileStorageService,
    SecretsService,
    AuditImmutableGuard,
  ],
})
export class PlatformModule implements NestModule {
  /**
   * SecurityMiddleware-ni barcha routelarga ulash
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}
