import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MediationType, ParticipantSide, MedResultStatus } from '@prisma/client';

export enum DisputeCategory {
  FAMILY = 'FAMILY',
  CIVIL = 'CIVIL',
  LABOR = 'LABOR',
  ECONOMIC = 'ECONOMIC',
  INTELLECTUAL = 'INTELLECTUAL',
  BANKING = 'BANKING',
  INVESTMENT = 'INVESTMENT',
  DIGITAL = 'DIGITAL',
  CROSS_BORDER = 'CROSS_BORDER',
}

export class CreateMediationDto {
  @IsOptional() @IsString() @MaxLength(100) courtCaseNumber?: string;
  @IsEnum(MediationType) type: MediationType;
  @IsEnum(DisputeCategory) disputeCategory: DisputeCategory;
  @IsOptional() @IsIn(['UZ', 'RU', 'EN']) documentLanguage?: 'UZ' | 'RU' | 'EN';
  @IsOptional() @IsUUID('4') businessOrganizationId?: string;
  @IsOptional() @IsUUID('4') preferredMediatorRegistryId?: string;
  @IsString() @MinLength(10) @MaxLength(6000) disputeSubject: string;
  @IsString() @MinLength(2) @MaxLength(160) respondentName: string;
  @IsString() @Matches(/^\+?[0-9()\-\s]{7,30}$/) respondentPhone: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'BUSINESS']) respondentType?: 'INDIVIDUAL' | 'BUSINESS';
  @IsOptional() @Matches(/^\d{9}$/) respondentTin?: string;
  @IsOptional() @Matches(/^\d{14}$/) respondentPinfl?: string;
  @IsOptional() @IsEmail() @MaxLength(254) respondentEmail?: string;
  @IsString() @IsIn(['Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Jizzax viloyati', 'Qashqadaryo viloyati', 'Navoiy viloyati', 'Namangan viloyati', 'Samarqand viloyati', 'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent viloyati', 'Farg‘ona viloyati', 'Xorazm viloyati', 'Toshkent shahri']) region: string;
  @IsBoolean() privacyAccepted: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('4', { each: true }) attachmentIds?: string[];
}

export class ConsentDto {
  @IsEnum(ParticipantSide) side: ParticipantSide;
  @IsEnum(['CONSENTED', 'DECLINED'] as const) status: 'CONSENTED' | 'DECLINED';
  @IsOptional() @IsBoolean() privacyAccepted?: boolean;
}

export class SelectMediatorDto { @IsUUID() mediatorRegistryId: string; }

export class CreateAgreementDto { @IsString() @MinLength(50) @MaxLength(10000) text: string; }

export class SignAgreementDto { @IsString() @MinLength(100) @MaxLength(500000) pkcs7: string; }

export class ScheduleSessionDto {
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsInt() @Min(15) @Max(480) durationMin?: number;
}

export class AgreementObligationDto {
  @IsEnum(ParticipantSide) side: ParticipantSide;
  @IsString() @MinLength(3) @MaxLength(2000) description: string;
  @IsDateString() dueDate: string;
}

export class RecordResultDto {
  @IsEnum(MedResultStatus) resultStatus: MedResultStatus;
  @IsString() @MaxLength(10000) summary: string;
  @IsOptional() @IsString() agreementText?: string;
  @IsOptional() @IsString() agreementFileUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AgreementObligationDto) obligations?: AgreementObligationDto[];
}

export class CreateMediationFeedbackDto {
  @IsInt() @Min(1) @Max(5) score: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
