import { Injectable } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface EsignVerifyResult {
  valid: boolean;
  pinfl: string;
  fullName: string;
  serialNumber: string;
  tin?: string;
  signedAt: string;
}

export interface EsignSignResult {
  pkcs7: string;
  signatureDate: string;
  signerPinfl: string;
}

export interface IEsignPort {
  verifyPkcs7(pkcs7Base64: string, documentHash?: string): Promise<EsignVerifyResult>;
  signDocument(documentHash: string, pinfl: string): Promise<EsignSignResult>;
}

@Injectable()
export class EsignIntegrationAdapter implements IEsignPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async verifyPkcs7(pkcs7Base64: string, documentHash?: string): Promise<EsignVerifyResult> {
    const endpoint = process.env.ESIGN_VERIFY_URL;
    return this.loggerService.executeWithResilience(
      async () => {
        if (!endpoint) throw new Error('ESIGN_VERIFY_URL sozlanmagan; imzo tekshiruvchisi sozlanmaguncha imzo qabul qilinmaydi');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.ESIGN_API_TOKEN ? { authorization: `Bearer ${process.env.ESIGN_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ pkcs7: pkcs7Base64, documentHash }),
        });
        if (!response.ok) throw new Error(`E-imzo tekshiruvi ${response.status} javobini qaytardi`);
        const result = await response.json() as Partial<EsignVerifyResult>;
        if (typeof result.valid !== 'boolean' || !result.pinfl || !result.serialNumber || !result.signedAt) {
          throw new Error('E-imzo tekshiruvchisining javobi noto‘g‘ri formatda');
        }
        return {
          valid: result.valid,
          pinfl: result.pinfl,
          fullName: result.fullName || '',
          serialNumber: result.serialNumber,
          tin: result.tin,
          signedAt: result.signedAt,
        };
      },
      {
        serviceName: 'E_SIGN',
        endpoint: endpoint || '/api/v1/pkcs7/verify',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { pkcs7: pkcs7Base64.slice(0, 50) + '...', documentHash },
    );
  }

  async signDocument(documentHash: string, pinfl: string): Promise<EsignSignResult> {
    const endpoint = process.env.ESIGN_SIGN_URL;
    return this.loggerService.executeWithResilience(
      async () => {
        if (!endpoint) throw new Error('ESIGN_SIGN_URL sozlanmagan; haqiqiy elektron imzo provayderi ulanmagan');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.ESIGN_API_TOKEN ? { authorization: `Bearer ${process.env.ESIGN_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ documentHash, pinfl }),
        });
        if (!response.ok) throw new Error(`E-imzo provayderi ${response.status} javobini qaytardi`);
        const result = await response.json() as Partial<EsignSignResult>;
        if (!result.pkcs7 || !result.signatureDate || result.signerPinfl !== pinfl) throw new Error('E-imzo provayderining javobi noto‘g‘ri yoki imzolovchi mos emas');
        return { pkcs7: result.pkcs7, signatureDate: result.signatureDate, signerPinfl: result.signerPinfl };
      },
      {
        serviceName: 'E_SIGN',
        endpoint: endpoint || '/api/v1/pkcs7/sign',
        timeoutMs: 5000,
        maxRetries: 1,
      },
      { documentHash, pinflLast4: pinfl.slice(-4) },
    );
  }
}
