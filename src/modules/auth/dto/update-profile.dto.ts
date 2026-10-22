import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '+998909876543',
    description: 'Telefon raqami (o\'zgartirish mumkin)',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'yangi_pochta@mail.uz',
    description: 'Elektron pochta (o\'zgartirish mumkin)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Elektron pochta formati noto\'g\'ri' })
  email?: string;

  @ApiPropertyOptional({
    example: 'Toshkent shahri, Chilonzor tumani, 9-mavze, 14-uy, 28-xonadon',
    description: 'Yashash / muloqot manzili (o\'zgartirish mumkin)',
  })
  @IsOptional()
  @IsString()
  address?: string;

  // The following fields are explicitly checked and disallowed in the service:
  @ApiPropertyOptional({ description: 'Tahrirlash taqiqlangan maydon (JShShIR)' })
  @IsOptional()
  pinfl?: never;

  @ApiPropertyOptional({ description: 'Tahrirlash taqiqlangan maydon (Pasport)' })
  @IsOptional()
  passportSeriesNumber?: never;

  @ApiPropertyOptional({ description: 'Tahrirlash taqiqlangan maydon (F.I.SH)' })
  @IsOptional()
  fullName?: never;

  @ApiPropertyOptional({ description: 'Tahrirlash taqiqlangan maydon (Tug\'ilgan sana)' })
  @IsOptional()
  birthDate?: never;
}
