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
  ],
})
export class AppModule {}
