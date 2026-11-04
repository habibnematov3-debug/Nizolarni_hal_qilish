import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicRegistryController, RegistryExpiryCronController, StaffRegistryController } from './registry.controller';
import { RegistryService } from './registry.service';

@Module({
  imports: [IntegrationModule, NotificationsModule],
  controllers: [PublicRegistryController, StaffRegistryController, RegistryExpiryCronController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegModule {}
