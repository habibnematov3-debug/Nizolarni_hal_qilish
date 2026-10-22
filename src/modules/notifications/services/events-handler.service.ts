import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationChannel } from '@prisma/client';

export interface DomainEventPayload {
  eventName:
    | 'ArizaYuborildi'
    | 'ArizaQabulQilindi'
    | 'ArizaRadEtildi'
    | 'ImtihonNatijasiTasdiqlandi'
    | 'TolovTasdiqlandi'
    | 'MediatorHolatiOzgardi'
    | 'ShartnomaImzolandi'
    | 'KelishuvImzolandi'
    | 'MajburiyatMuddatiYaqin'
    | 'HisobotYuborildi'
    | 'HisobotQaytarildi'
    | 'SertifikatOlindi';
  sourceModule: string;
  userId: string;
  variables: Record<string, any>;
  channels?: NotificationChannel[];
}

@Injectable()
export class EventsHandlerService {
  private readonly logger = new Logger(EventsHandlerService.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handles platform domain events and triggers notifications accordingly (Section 8)
   */
  async handleEvent(event: DomainEventPayload) {
    this.logger.log(`[Event Received] ${event.eventName} from [${event.sourceModule}] for User: ${event.userId}`);

    let templateCode = 'APPLICATION_STATUS';
    const channels = event.channels || [NotificationChannel.CABINET, NotificationChannel.SMS];

    switch (event.eventName) {
      case 'ArizaYuborildi':
      case 'ArizaQabulQilindi':
      case 'ArizaRadEtildi':
        templateCode = 'APPLICATION_STATUS';
        break;

      case 'ImtihonNatijasiTasdiqlandi':
        templateCode = 'EXAM_RESULT';
        break;

      case 'TolovTasdiqlandi':
      case 'ShartnomaImzolandi':
      case 'KelishuvImzolandi':
        templateCode = 'CONTRACT_STATUS';
        break;

      case 'MediatorHolatiOzgardi':
      case 'SertifikatOlindi':
        templateCode = 'QUALIFICATION_UPGRADE_REMINDER';
        break;

      case 'MajburiyatMuddatiYaqin':
        templateCode = 'OBLIGATION_EXECUTION_DEADLINE';
        break;

      case 'HisobotYuborildi':
      case 'HisobotQaytarildi':
        templateCode = 'REPORT_SUBMISSION_DEADLINE';
        break;

      default:
        templateCode = 'APPLICATION_STATUS';
    }

    const idempotencyKey = `evt_${event.eventName}_${event.userId}_${event.variables?.caseNumber || Date.now()}`;

    return this.notificationsService.send({
      userId: event.userId,
      templateCode,
      variables: event.variables,
      channels,
      idempotencyKey,
    });
  }
}
