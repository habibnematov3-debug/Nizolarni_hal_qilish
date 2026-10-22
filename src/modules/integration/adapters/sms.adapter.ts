import { Injectable } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface ISmsPort {
  sendSms(phone: string, text: string): Promise<{ success: boolean; messageId: string }>;
}

@Injectable()
export class SmsIntegrationAdapter implements ISmsPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async sendSms(phone: string, text: string): Promise<{ success: boolean; messageId: string }> {
    return this.loggerService.executeWithResilience(
      async () => {
        const messageId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        return {
          success: true,
          messageId,
        };
      },
      {
        serviceName: 'SMS_GATEWAY',
        endpoint: '/api/v1/sms/send',
        timeoutMs: 3000,
        maxRetries: 2,
      },
      { phone, text },
    );
  }
}
