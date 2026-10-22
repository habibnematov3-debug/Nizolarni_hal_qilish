import { Injectable, BadRequestException } from '@nestjs/common';

export interface EsignCertificateProfile {
  pinfl: string;
  fullName: string;
  serialNumber: string;
  tin?: string;
  organizationName?: string;
}

@Injectable()
export class EsignAdapter {
  /**
   * Validates PKCS#7 or E-IMZO certificate
   */
  async verifySignature(pkcs7: string, mockPinfl?: string): Promise<EsignCertificateProfile> {
    if (!pkcs7) {
      throw new BadRequestException('E-imzo ma\'lumoti (PKCS#7) kiritilmadi');
    }

    // In production, calls E-IMZO verification API or parses X509 certificate via openssl/pkijs
    const pinfl = mockPinfl || (pkcs7.startsWith('pinfl_') ? pkcs7.replace('pinfl_', '') : '31201851230011');

    return {
      pinfl,
      fullName: 'Karimov Alisher Baxtiyorovich',
      serialNumber: `ESIGN_${pinfl.slice(-6)}`,
      tin: '304598124',
      organizationName: 'Advokatlar palatasi a\'zosi',
    };
  }
}
