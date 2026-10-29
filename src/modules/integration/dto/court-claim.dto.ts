import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

export class CourtClaimDto {
  @ApiProperty({ example: '2-1001-2601/450', description: 'Sud ishi raqami' })
  @IsNotEmpty({ message: 'Sud ishi raqami kiritilishi shart' })
  @IsString()
  courtCaseNumber: string;

  @ApiProperty({ example: 'Fuqarolik ishlari bo\'yicha Mirzo Ulug\'bek tumanlararo sudi', description: 'Sud nomi' })
  @IsNotEmpty({ message: 'Sud nomi kiritilishi shart' })
  @IsString()
  courtName: string;

  @ApiPropertyOptional({ example: 'Yo\'ldoshev A.S.', description: 'Sudya F.I.SH' })
  @IsOptional()
  @IsString()
  judgeName?: string;

  @ApiProperty({ example: 'Sobirov Shavkat Alimovich', description: 'Da\'vogar F.I.SH' })
  @IsNotEmpty({ message: 'Da\'vogar F.I.SH kiritilishi shart' })
  @IsString()
  claimantName: string;

  @ApiPropertyOptional({ example: '31201851230044', description: 'Da\'vogar JShShIR' })
  @IsOptional()
  @IsString()
  claimantPinfl?: string;

  @ApiPropertyOptional({ example: '309876543', description: 'Da’vogar tashkilot STIRi' })
  @IsOptional()
  @Matches(/^\d{9}$/)
  claimantTin?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Da\'vogar telefoni' })
  @IsOptional()
  @IsString()
  claimantPhone?: string;

  @ApiProperty({ example: 'Karimov Bahodir Zokirovich', description: 'Javobgar F.I.SH' })
  @IsNotEmpty({ message: 'Javobgar F.I.SH kiritilishi shart' })
  @IsString()
  respondentName: string;

  @ApiPropertyOptional({ example: '31201851230055', description: 'Javobgar JShShIR' })
  @IsOptional()
  @IsString()
  respondentPinfl?: string;

  @ApiPropertyOptional({ example: '309876543', description: 'Javobgar tashkilot STIRi' })
  @IsOptional()
  @Matches(/^\d{9}$/)
  respondentTin?: string;

  @ApiPropertyOptional({ example: '+998907654321', description: 'Javobgar telefoni' })
  @IsOptional()
  @IsString()
  respondentPhone?: string;

  @ApiProperty({ example: 'Qarz shartnomasi bo\'yicha nizoni hal qilish va qarzni undirish', description: 'Nizo predmeti' })
  @IsNotEmpty({ message: 'Nizo predmeti kiritilishi shart' })
  @IsString()
  disputeSubject: string;

  @ApiPropertyOptional({ example: 45000000, description: 'Da\'vo bahosi (so\'mda)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  claimAmount?: number;

  @ApiProperty({ example: '2026-10-22', description: 'Sud ajrimi chiqarilgan sana' })
  @IsNotEmpty({ message: 'Ajrim sanasi kiritilishi shart' })
  @IsDateString()
  courtOrderDate: string;

  @ApiPropertyOptional({ example: 'https://e-sud.sud.uz/files/order_450.pdf', description: 'Sud ajrimi hujjati havolasi' })
  @IsOptional()
  @IsString()
  documentUrl?: string;

  @ApiPropertyOptional({ description: 'Qo\'shimcha parametrlar' })
  @IsOptional()
  metadata?: any;
}
