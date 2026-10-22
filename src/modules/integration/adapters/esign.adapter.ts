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
  verifyPkcs7(pkcs7Base64: string): Promise<EsignVerifyResult>;
  signDocument(documentHash: string, pinfl: string): Promise<EsignSignResult>;
}

@Injectable()
export class EsignIntegrationAdapter implements IEsignPort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async verifyPkcs7(pkcs7Base64: string): Promise<EsignVerifyResult> {
    return this.loggerService.executeWithResilience(
      async () => {
        const pinfl = pkcs7Base64.startsWith('pinfl_')
          ? pkcs7Base64.replace('pinfl_', '')
          : '31201851230011';

        return {
          valid: true,
          pinfl,
          fullName: 'Karimov Alisher Baxtiyorovich',
          serialNumber: `ESIGN_${pinfl.slice(-6)}`,
          tin: '304598124',
          signedAt: new Date().toISOString(),
        };
      },
      {
        serviceName: 'E_SIGN',
        endpoint: '/api/v1/pkcs7/verify',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { pkcs7: pkcs7Base64.slice(0, 50) + '...' },
    );
  }

  async signDocument(documentHash: string, pinfl: string): Promise<EsignSignResult> {
    return this.loggerService.executeWithResilience(
      async () => {
        return {
          pkcs7: `MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADC_${Date.now()}`,
          signatureDate: new Date().toISOString(),
          signerPinfl: pinfl,
        };
      },
      {
        serviceName: 'E_SIGN',
        endpoint: '/api/v1/pkcs7/sign',
        timeoutMs: 5000,
        maxRetries: 1,
      },
      { documentHash, pinfl },
    );
  }
}
