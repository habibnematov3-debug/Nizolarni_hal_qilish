import { Module, Global } from '@nestjs/common';
import { IntegrationLoggerService } from './services/integration-logger.service';
import { OneIdIntegrationAdapter } from './adapters/one-id.adapter';
import { EsignIntegrationAdapter } from './adapters/esign.adapter';
import { MyGovIntegrationAdapter } from './adapters/mygov.adapter';
import { BillingIntegrationAdapter } from './adapters/billing.adapter';
import { SmsIntegrationAdapter } from './adapters/sms.adapter';
import { LegalCapacityIntegrationAdapter } from './adapters/legal-capacity.adapter';
import { VideoConferenceIntegrationAdapter } from './adapters/video-conference.adapter';
import { CourtSystemIntegrationAdapter } from './adapters/court-system.adapter';
import { TrainingCenterIntegrationAdapter } from './adapters/training-center.adapter';
import { PersonalizationIntegrationAdapter } from './adapters/personalization.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ExternalIntegrationController,
  AdminIntegrationsController,
} from './controllers/external-integration.controller';

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [
    IntegrationLoggerService,
    OneIdIntegrationAdapter,
    EsignIntegrationAdapter,
    MyGovIntegrationAdapter,
    BillingIntegrationAdapter,
    SmsIntegrationAdapter,
    LegalCapacityIntegrationAdapter,
    VideoConferenceIntegrationAdapter,
    CourtSystemIntegrationAdapter,
    TrainingCenterIntegrationAdapter,
    PersonalizationIntegrationAdapter,
  ],
  controllers: [
    ExternalIntegrationController,
    AdminIntegrationsController,
  ],
  exports: [
    IntegrationLoggerService,
    OneIdIntegrationAdapter,
    EsignIntegrationAdapter,
    MyGovIntegrationAdapter,
    BillingIntegrationAdapter,
    SmsIntegrationAdapter,
    LegalCapacityIntegrationAdapter,
    VideoConferenceIntegrationAdapter,
    CourtSystemIntegrationAdapter,
    TrainingCenterIntegrationAdapter,
    PersonalizationIntegrationAdapter,
  ],
})
export class IntegrationModule {}
