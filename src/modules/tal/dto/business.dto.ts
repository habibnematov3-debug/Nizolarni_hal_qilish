import { BusinessAuthorityDocumentType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateBusinessOrganizationDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional() @IsString() @MaxLength(1000) address?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30) phone?: string;

  @ApiPropertyOptional({ maxLength: 254 })
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;

  @ApiPropertyOptional({ maxLength: 34, description: 'Bank hisobvarag‘i' })
  @IsOptional() @IsString() @MaxLength(34) bankAccount?: string;
}

export class RegisterBusinessAuthorityDocumentDto {
  @ApiProperty({ format: 'uuid', description: 'Avval PRIVATE holatda yuklangan fayl IDsi' })
  @IsUUID('4') fileId: string;

  @ApiProperty({ enum: BusinessAuthorityDocumentType })
  @IsEnum(BusinessAuthorityDocumentType) type: BusinessAuthorityDocumentType;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100) documentNumber?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional() @IsDateString() validUntil?: string;
}
