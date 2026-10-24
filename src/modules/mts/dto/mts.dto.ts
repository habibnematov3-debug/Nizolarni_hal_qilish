import { IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MediationType, ParticipantSide, MedResultStatus } from '@prisma/client';

export enum DisputeCategory {
  FAMILY = 'FAMILY',
  CIVIL = 'CIVIL',
  LABOR = 'LABOR',
  ECONOMIC = 'ECONOMIC',
  INTELLECTUAL = 'INTELLECTUAL',
  BANKING = 'BANKING',
}

export class CreateMediationDto {
  @IsOptional() @IsString() @MaxLength(100) courtCaseNumber?: string;
  @IsEnum(MediationType) type: MediationType;
  @IsEnum(DisputeCategory) disputeCategory: DisputeCategory;
  @IsString() @MinLength(10) @MaxLength(3000) disputeSubject: string;
  @IsString() @MinLength(2) @MaxLength(160) respondentName: string;
  @IsString() @Matches(/^\+?[0-9()\-\s]{7,30}$/) respondentPhone: string;
  @IsOptional() @Matches(/^\d{14}$/) respondentPinfl?: string;
  @IsOptional() @IsEmail() @MaxLength(254) respondentEmail?: string;
  @IsString() @IsIn(['Qoraqalpog‘iston Respublikasi', 'Andijon viloyati', 'Buxoro viloyati', 'Jizzax viloyati', 'Qashqadaryo viloyati', 'Navoiy viloyati', 'Namangan viloyati', 'Samarqand viloyati', 'Surxondaryo viloyati', 'Sirdaryo viloyati', 'Toshkent viloyati', 'Farg‘ona viloyati', 'Xorazm viloyati', 'Toshkent shahri']) region: string;
  @IsBoolean() privacyAccepted: boolean;
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

export class RecordResultDto {
  @IsEnum(MedResultStatus) resultStatus: MedResultStatus;
  @IsString() @MaxLength(10000) summary: string;
  @IsOptional() @IsString() agreementText?: string;
  @IsOptional() @IsString() agreementFileUrl?: string;
}
