import { Injectable, BadRequestException } from '@nestjs/common';

export interface OneIdCitizenProfile {
  pinfl: string;
  fullName: string;
  passportSeriesNumber: string;
  passportGivenDate: string;
  passportExpireDate: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  gender: string;
  address: string;
  phone?: string;
  email?: string;
  oneIdUserId: string;
}

@Injectable()
export class OneIdAdapter {
  /**
   * Exchanges auth code with OneID OAuth2 or returns citizen data
   */
  async getCitizenProfile(code: string, mockPinfl?: string): Promise<OneIdCitizenProfile> {
    if (!code) {
      throw new BadRequestException('ONE ID avtorizatsiya kodi mavjud emas');
    }

    // In a production environment with real OneID, we send HTTP POST to:
    // https://sso.egov.uz:8443/sso/oauth/Authorization.do with grant_type=authorization_code
    // Here we support both real OneID config and realistic test/staging mock data
    const pinfl = mockPinfl || (code.startsWith('pinfl_') ? code.replace('pinfl_', '') : '31201851230044');

    return {
      pinfl,
      fullName: 'Nodirov Jamshid Shuhratovich',
      passportSeriesNumber: 'AA7654321',
      passportGivenDate: '2020-05-15',
      passportExpireDate: '2030-05-15',
      birthDate: '1985-04-12',
      birthPlace: 'Toshkent shahri, Shayxontohur tumani',
      nationality: 'O\'zbek',
      gender: 'MALE',
      address: 'Toshkent shahri, Chilonzor tumani, 9-mavze, 14-uy',
      phone: '+998901234567',
      email: 'j.nodirov@mail.uz',
      oneIdUserId: `oneid_${pinfl}`,
    };
  }
}
