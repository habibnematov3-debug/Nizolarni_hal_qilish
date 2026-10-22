import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MobileIdLoginDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Mobil ID orqali ro\'yxatdan o\'tgan telefon raqami',
  })
  @IsNotEmpty({ message: 'Telefon raqami kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'Mobil ID SMS orqali kelgan bir martalik tasdiqlash kodi',
  })
  @IsNotEmpty({ message: 'Tasdiqlash kodi kiritilishi shart' })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    example: '31201851230044',
    description: 'Dev/Test uchun: agar tashqi Mobil ID xizmati ulanmagan bo\'lsa, test JShShIR',
  })
  @IsOptional()
  @IsString()
  mockPinfl?: string;
}
