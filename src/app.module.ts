import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { DictionariesModule } from './modules/dictionaries/dictionaries.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ContentModule } from './modules/content/content.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PlatformModule } from './modules/platform/platform.module';
import { MedModule } from './modules/med/med.module';
import { MkModule } from './modules/mk/mk.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    RolesModule,
    UsersModule,
    DictionariesModule,
    SettingsModule,
    ContentModule,
    NotificationsModule,
    IntegrationModule,
    ReportsModule,
    // INFRA moduli: monitoring, audit, fayllar, xavfsizlik
    PlatformModule,
    MedModule,
    MkModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
