import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ description: 'Qabul qiluvchi foydalanuvchi ID si' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'APPLICATION_STATUS',
    description: 'Xabar shabloni kodi (APPLICATION_STATUS, EXAM_INVITATION, EXAM_RESULT, CONTRACT_STATUS, va h.k.)',
  })
  @IsNotEmpty()
  @IsString()
  templateCode: string;

  @ApiPropertyOptional({
    example: { fullName: 'Jamshid Nodirov', caseNumber: 'AR-2026-0042', statusName: 'Qabul qilindi' },
    description: 'Shablon o\'zgaruvchilari (key-value)',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.CABINET, NotificationChannel.SMS],
    description: 'Yuborish kanallari (standart: CABINET va SMS)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    example: 'case_app_12345_status_accepted',
    description: 'Idempotentlik kaliti (bir xabar 2 marta yuborilmasligi uchun)',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
