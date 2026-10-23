import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { PublicRegistryController, StaffRegistryController } from './registry.controller';
import { RegistryService } from './registry.service';

@Module({
  imports: [IntegrationModule],
  controllers: [PublicRegistryController, StaffRegistryController],
  providers: [RegistryService],
  exports: [RegistryService],
})
export class RegModule {}
