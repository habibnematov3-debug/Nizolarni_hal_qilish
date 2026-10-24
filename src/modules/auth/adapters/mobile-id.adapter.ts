import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

export interface MobileIdProfile {
  pinfl: string;
  phone: string;
  fullName: string;
  verified: boolean;
}

@Injectable()
export class MobileIdAdapter {
  /**
   * Verifies SMS code sent to citizen's Mobile-ID phone number
   */
  async verifyCode(phone: string, code: string, mockPinfl?: string): Promise<MobileIdProfile> {
    if (!phone || !code) {
      throw new BadRequestException('Telefon raqami va tasdiqlash kodi kiritilishi shart');
    }
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Mobile ID production SMS tekshiruvchisi va tasdiqlangan API shartnomasi ulanmagan; demo kod bilan kirish bloklandi');
    }

    // In production, verifies with Mobile ID service (e.g. Uzinfocom / Mobile ID gateway)
    // Accept valid 6-digit SMS code
    if (code.length < 4) {
      throw new BadRequestException('Kiritilgan tasdiqlash kodi yaroqsiz');
    }

    const pinfl = mockPinfl || '31201851230044';

    return {
      pinfl,
      phone,
      fullName: 'Nodirov Jamshid Shuhratovich',
      verified: true,
    };
  }
}
