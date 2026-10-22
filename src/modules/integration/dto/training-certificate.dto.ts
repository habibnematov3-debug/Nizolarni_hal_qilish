import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TrainingCertificateDto {
  @ApiProperty({ example: 'MED-YMOM-2026-0042', description: 'Sertifikat unikal raqami' })
  @IsNotEmpty({ message: 'Sertifikat raqami kiritilishi shart' })
  @IsString()
  certificateNumber: string;

  @ApiProperty({ example: '31201851230011', description: 'Tinglovchi fuqaro JShShIR' })
  @IsNotEmpty({ message: 'JShShIR kiritilishi shart' })
  @IsString()
  pinfl: string;

  @ApiProperty({ example: 'Karimov Alisher Baxtiyorovich', description: 'Tinglovchi to\'liq ismi' })
  @IsNotEmpty({ message: 'F.I.SH kiritilishi shart' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'TRAIN_YMOM', description: 'O\'quv markazi kodi (TRAIN_YMOM yoki TDYU)' })
  @IsNotEmpty({ message: 'O\'quv markazi kodi kiritilishi shart' })
  @IsString()
  trainingCenterCode: string;

  @ApiProperty({ example: 'Mediatorlarni tayyorlash bo\'yicha maxsus o\'quv kursi', description: 'Kurs nomi' })
  @IsNotEmpty({ message: 'Kurs nomi kiritilishi shart' })
  @IsString()
  courseName: string;

  @ApiProperty({ example: '2026-10-15', description: 'Sertifikat berilgan sana' })
  @IsNotEmpty({ message: 'Berilgan sana kiritilishi shart' })
  @IsDateString()
  issuedDate: string;

  @ApiProperty({ example: '2029-10-15', description: 'Amal qilish muddati (3 yil)' })
  @IsNotEmpty({ message: 'Amal qilish muddati kiritilishi shart' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({ example: 'https://yumom.uz/certificates/MED-2026-0042.pdf', description: 'Elektron sertifikat fayl havolasi' })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Qo\'shimcha parametrlar' })
  @IsOptional()
  metadata?: any;
}
