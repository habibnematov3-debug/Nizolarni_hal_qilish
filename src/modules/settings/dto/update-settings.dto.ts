import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class TimerSettingsDto {
  @ApiProperty({ example: 3, description: 'Arizani qabul qilish / ro\'yxatdan o\'tkazish muddati (kun)' })
  @IsInt()
  @Min(1)
  caseRegistrationDays: number;

  @ApiProperty({ example: 5, description: 'Mediator tanlash yoki tayinlash muddati (kun)' })
  @IsInt()
  @Min(1)
  mediatorAssignmentDays: number;

  @ApiProperty({ example: 30, description: 'Mediatsiya jarayonini o\'tkazishning maksimal muddati (kun)' })
  @IsInt()
  @Min(1)
  mediationProcessMaxDays: number;

  @ApiProperty({ example: 10, description: 'Kelishuv ijrosini tasdiqlash muddati (kun)' })
  @IsInt()
  @Min(1)
  agreementExecutionConfirmationDays: number;
}

export class FileLimitSettingsDto {
  @ApiProperty({ example: 25, description: 'Maksimal ruxsat berilgan fayl hajmi (Megabaytlarda)' })
  @IsInt()
  @Min(1)
  maxFileSizeMb: number;

  @ApiProperty({
    example: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip'],
    description: 'Ruxsat etilgan fayl formatlari kengaytmalari',
  })
  @IsArray()
  @IsString({ each: true })
  allowedExtensions: string[];

  @ApiProperty({ example: 10, description: 'Bir vaqtda yuklanishi mumkin bo\'lgan maksimal fayllar soni' })
  @IsInt()
  @Min(1)
  maxFilesCount: number;
}

export class NotificationTemplateDto {
  @ApiProperty({ example: 'CASE_REGISTERED', description: 'Xabarnoma kodi' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Arizangiz muvaffaqiyatli qabul qilindi. Ariza raqami: {{caseNumber}}', description: 'SMS shabloni' })
  @IsString()
  smsTemplate: string;

  @ApiProperty({ example: 'Hurmatli {{fullName}}, sizning {{caseNumber}}-sonli arizangiz ko\'rib chiqilmoqda.', description: 'Email shabloni' })
  @IsString()
  emailTemplate: string;
}

export class PaymentSettingsDto {
  @ApiProperty({ example: 350000, description: 'Malaka imtihoni uchun to‘lov summasi (UZS)' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) examFeeAmount: number;

  @ApiProperty({ example: 'Toshkent shahar adliya boshqarmasi' })
  @IsString() @MinLength(2) examFeeBeneficiaryName: string;

  @ApiProperty({ example: '20208000900123456001' })
  @IsString() @MinLength(8) examFeeBeneficiaryAccount: string;

  @ApiProperty({ example: '01017' })
  @IsString() @MinLength(3) examFeeBeneficiaryBankCode: string;

  @ApiPropertyOptional({ example: 'Toshkent shahri' })
  @IsOptional() @IsString() examFeeBeneficiaryRegion?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: TimerSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimerSettingsDto)
  timers?: TimerSettingsDto;

  @ApiPropertyOptional({ type: FileLimitSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileLimitSettingsDto)
  fileLimits?: FileLimitSettingsDto;

  @ApiPropertyOptional({ type: [NotificationTemplateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationTemplateDto)
  notifications?: NotificationTemplateDto[];

  @ApiPropertyOptional({
    example: { platformName: 'Nizolarni muqobil hal etish platformasi', supportPhone: '1008' },
    description: 'Boshqa umumiy sozlamalar',
  })
  @IsOptional()
  @IsObject()
  general?: Record<string, any>;

  @ApiPropertyOptional({ type: PaymentSettingsDto, description: 'To‘lov miqdori va imtihon to‘lovi oluvchisi' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentSettingsDto)
  paymentSettings?: PaymentSettingsDto;
}
