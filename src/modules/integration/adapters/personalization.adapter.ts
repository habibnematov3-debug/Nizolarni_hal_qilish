import { Injectable } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface CitizenBiometricData {
  pinfl: string;
  passportSeriesNumber: string;
  fullName: string;
  birthDate: string;
  gender: string;
  nationality: string;
  documentStatus: 'VALID' | 'EXPIRED' | 'INVALID';
  photoBase64Url?: string;
}

export interface IPersonalizationPort {
  verifyBiometrics(pinfl: string, passportSeriesNumber: string): Promise<CitizenBiometricData>;
}

@Injectable()
export class PersonalizationIntegrationAdapter implements IPersonalizationPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async verifyBiometrics(pinfl: string, passportSeriesNumber: string): Promise<CitizenBiometricData> {
    return this.loggerService.executeWithResilience(
      async () => {
        return {
          pinfl,
          passportSeriesNumber,
          fullName: 'Nodirov Jamshid Shuhratovich',
          birthDate: '1985-04-12',
          gender: 'MALE',
          nationality: 'O\'zbek',
          documentStatus: 'VALID',
          photoBase64Url: 'https://dpa.gov.uz/photos/sample_avatar.jpg',
        };
      },
      {
        serviceName: 'PERSONALIZATION_AGENCY',
        endpoint: '/api/v1/citizen/biometrics-check',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { pinfl, passportSeriesNumber },
    );
  }
}
