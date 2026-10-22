import { Injectable } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface LegalCapacityResult {
  pinfl: string;
  hasCriminalRecord: boolean; // Sudlanganlik bormi
  isLegallyIncompetent: boolean; // Muomalaga layoqatsizmi
  status: 'APPROVED' | 'REJECTED' | 'IN_PROGRESS'; // 3-bo'lim: «tekshiruv jarayonda» holati
  referenceNumber: string;
  checkDate: string;
  notes?: string;
}

export interface ILegalCapacityPort {
  checkStatus(pinfl: string): Promise<LegalCapacityResult>;
}

@Injectable()
export class LegalCapacityIntegrationAdapter implements ILegalCapacityPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async checkStatus(pinfl: string): Promise<LegalCapacityResult> {
    return this.loggerService.executeWithResilience(
      async () => {
        // Mock check logic:
        // PINFL starting with 999 triggers rejection; normal returns clean
        const isProblematic = pinfl.startsWith('999');

        return {
          pinfl,
          hasCriminalRecord: isProblematic,
          isLegallyIncompetent: isProblematic,
          status: isProblematic ? 'REJECTED' : 'APPROVED',
          referenceNumber: `IIV-CAP-${Date.now()}`,
          checkDate: new Date().toISOString(),
          notes: isProblematic ? 'Sudlanganlik ma\'lumoti mavjud' : 'Sudlanmagan, muomala layoqatiga ega',
        };
      },
      {
        serviceName: 'LEGAL_CAPACITY_REGISTRY',
        endpoint: '/api/v1/citizen/check-capacity',
        timeoutMs: 4000,
        maxRetries: 2,
        // Fallback value if external service is temporarily unreachable: "tekshiruv jarayonda" (Section 3)
        fallbackValue: {
          pinfl,
          hasCriminalRecord: false,
          isLegallyIncompetent: false,
          status: 'IN_PROGRESS',
          referenceNumber: `PENDING-${Date.now()}`,
          checkDate: new Date().toISOString(),
          notes: 'Tashqi tizim bilan aloqa mavjud emas, tekshiruv jarayonda',
        },
      },
      { pinfl },
    );
  }
}
