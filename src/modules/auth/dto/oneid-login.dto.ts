import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OneIdLoginDto {
  @ApiProperty({
    example: 'auth_code_sample_oneid_2026',
    description: 'ONE ID tizimidan qaytgan avtorizatsiya kodi (authorization_code)',
  })
  @IsNotEmpty({ message: 'ONE ID avtorizatsiya kodi kiritilishi shart' })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    example: '31201851230044',
    description: 'Dev/Test uchun: agar tashqi ONE ID serveri ulanmagan bo\'lsa, test JShShIR',
  })
  @IsOptional()
  @IsString()
  mockPinfl?: string;
}
