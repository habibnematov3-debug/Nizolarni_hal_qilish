import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EsignLoginDto {
  @ApiProperty({
    example: 'MIAGCSqGSIb3DQEHAqCAMIACAQExDzANBglghkgBZQMEAgEFADC...',
    description: 'E-IMZO orqali imzolangan PKCS#7 / CMS formatidagi ma\'lumot yoki sertifikat',
  })
  @IsNotEmpty({ message: 'E-imzo imzosi (PKCS#7) kiritilishi shart' })
  @IsString()
  pkcs7: string;

  @ApiPropertyOptional({
    example: '31201851230011',
    description: 'Dev/Test uchun: agar tashqi E-IMZO tekshirish xizmati ulanmagan bo\'lsa, test JShShIR',
  })
  @IsOptional()
  @IsString()
  mockPinfl?: string;
}
