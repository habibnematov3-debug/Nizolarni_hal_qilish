import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType, EntityStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Adliya vazirligi', description: 'Tashkilot nomi' })
  @IsNotEmpty({ message: 'Tashkilot nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: OrganizationType,
    example: OrganizationType.MINISTRY,
    description: 'Tashkilot turi: MINISTRY (Vazirlik), REGIONAL_DEPARTMENT (Hududiy boshqarma), TRAINING_CENTER (O\'quv markazi)',
  })
  @IsNotEmpty({ message: 'Tashkilot turi kiritilishi shart' })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiPropertyOptional({
    example: null,
    description: 'Yuqori tashkilot ID si (ierarxiya uchun)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 'Toshkent shahri', description: 'Hudud' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: '10001', description: 'Tashkilot kodi / STIR' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Sayilgoh ko\'chasi, 5-uy', description: 'Manzil' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+998712331305', description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@adliya.uz', description: 'Elektron pochta' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: EntityStatus, default: EntityStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
