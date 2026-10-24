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
    const endpoint = process.env.LEGAL_CAPACITY_API_URL?.trim();
    const pending = (notes: string): LegalCapacityResult => ({
      pinfl,
      hasCriminalRecord: false,
      isLegallyIncompetent: false,
      status: 'IN_PROGRESS',
      referenceNumber: `PENDING-${Date.now()}`,
      checkDate: new Date().toISOString(),
      notes,
    });
    if (!endpoint) return pending('Vakolatli tekshiruv reyestri ulanmagan; ariza qo‘lda ko‘rib chiqish uchun yuboriladi.');

    return this.loggerService.executeWithResilience(
      async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.LEGAL_CAPACITY_API_TOKEN ? { authorization: `Bearer ${process.env.LEGAL_CAPACITY_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ pinfl }),
        });
        if (!response.ok) throw new Error(`Huquqiy layoqat reyestri ${response.status} javobini qaytardi`);
        const result = await response.json() as Partial<LegalCapacityResult>;
        if (result.pinfl !== pinfl || typeof result.hasCriminalRecord !== 'boolean' || typeof result.isLegallyIncompetent !== 'boolean' || !['APPROVED', 'REJECTED', 'IN_PROGRESS'].includes(String(result.status)) || !result.referenceNumber) {
          throw new Error('Huquqiy layoqat reyestrining javobi talab qilingan formatga mos emas');
        }
        return {
          pinfl,
          hasCriminalRecord: result.hasCriminalRecord,
          isLegallyIncompetent: result.isLegallyIncompetent,
          status: result.status as LegalCapacityResult['status'],
          referenceNumber: result.referenceNumber,
          checkDate: result.checkDate || new Date().toISOString(),
          notes: result.notes,
        };
      },
      {
        serviceName: 'LEGAL_CAPACITY_REGISTRY',
        endpoint,
        timeoutMs: 4000,
        maxRetries: 2,
        fallbackValue: pending('Davlat reyestri vaqtincha javob bermadi; tekshiruv davom etadi.'),
      },
      { pinflLast4: pinfl.slice(-4) },
    );
  }
}
