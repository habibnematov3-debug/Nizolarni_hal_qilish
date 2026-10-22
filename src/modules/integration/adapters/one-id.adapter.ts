import { Injectable } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface OneIdCitizenInfo {
  pinfl: string;
  fullName: string;
  passportSeriesNumber: string;
  birthDate: string;
  nationality: string;
  gender: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface IOneIdPort {
  exchangeCode(code: string): Promise<OneIdCitizenInfo>;
  verifyMobileId(phone: string, code: string): Promise<{ verified: boolean; pinfl: string }>;
}

@Injectable()
export class OneIdIntegrationAdapter implements IOneIdPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async exchangeCode(code: string): Promise<OneIdCitizenInfo> {
    return this.loggerService.executeWithResilience(
      async () => {
        // Contract mock or API call
        const pinfl = code.startsWith('pinfl_') ? code.replace('pinfl_', '') : '31201851230044';
        return {
          pinfl,
          fullName: 'Nodirov Jamshid Shuhratovich',
          passportSeriesNumber: 'AA7654321',
          birthDate: '1985-04-12',
          nationality: 'O\'zbek',
          gender: 'MALE',
          address: 'Toshkent shahri, Chilonzor tumani, 9-mavze, 14-uy',
          phone: '+998901234567',
          email: 'j.nodirov@mail.uz',
        };
      },
      {
        serviceName: 'ONE_ID',
        endpoint: '/sso/oauth/Authorization.do',
        timeoutMs: 3000,
        maxRetries: 2,
      },
      { code },
    );
  }

  async verifyMobileId(phone: string, code: string): Promise<{ verified: boolean; pinfl: string }> {
    return this.loggerService.executeWithResilience(
      async () => {
        return {
          verified: true,
          pinfl: '31201851230044',
        };
      },
      {
        serviceName: 'MOBILE_ID',
        endpoint: '/api/v1/mobile-id/verify',
        timeoutMs: 3000,
        maxRetries: 1,
      },
      { phone, code },
    );
  }
}
