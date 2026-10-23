import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CertificateDeliveryMethod, CertificateReplacementReason } from '@prisma/client';

export class UpdatePortfolioDto {
  @IsOptional() @IsArray() specialization?: string[];
  @IsOptional() @IsString() workExperience?: string;
  @IsOptional() @IsString() achievements?: string;
  @IsOptional() @IsString() @MaxLength(2000) profileBio?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsArray() media?: string[];
  @IsOptional() isPublic?: boolean;
}

export class CreateCalendarEventDto {
  @IsString() @MaxLength(200) title: string;
  @IsDateString() eventDate: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class RegistryRemovalDto {
  @IsString() @MaxLength(2000) reason: string;
}

export class CertificateReplacementDto {
  @IsEnum(CertificateReplacementReason) reason: CertificateReplacementReason;
  @IsUUID() supportingDocumentId: string;
  @IsOptional() @IsUUID() photoFileId?: string;
  @IsEnum(CertificateDeliveryMethod) deliveryMethod: CertificateDeliveryMethod;
  @IsOptional() @IsString() @MaxLength(1000) deliveryAddress?: string;
}

export class SendMessageDto {
  @IsUUID() recipientId: string;
  @IsString() @MaxLength(10000) body: string;
  @IsOptional() @IsArray() attachmentIds?: string[];
}
