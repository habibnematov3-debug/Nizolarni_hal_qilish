import { RegistryEntryStatus, RegistryType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  IsNumberString,
  Length,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateRegistryEntryDto {
  @ApiPropertyOptional({ description: 'Mavjud platforma foydalanuvchisining UUID si' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'JShShIR; takroriy yozuvlarni aniqlash uchun' })
  @IsOptional()
  @IsString()
  @IsNumberString()
  @Length(14, 14)
  pinfl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registryNumber?: string;

  @ApiProperty({ enum: RegistryType })
  @IsEnum(RegistryType)
  type: RegistryType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  fullName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  region: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '1985-04-12' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ type: [String], example: ['FAMILY', 'CIVIL'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  specialization: string[];

  @ApiProperty({ type: [String], example: ['uz', 'ru'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  languages: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  certificateIssuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  certificateExpiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  publicProfile?: boolean;
}

export class UpdateRegistryEntryDto extends PartialType(CreateRegistryEntryDto) {}

export class UpdateRegistryStatusDto {
  @ApiProperty({ enum: RegistryEntryStatus })
  @IsEnum(RegistryEntryStatus)
  status: RegistryEntryStatus;

  @ApiPropertyOptional({ description: 'Holat o\'zgarishi sababi' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
