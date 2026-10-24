import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MediationType, ParticipantSide, MedResultStatus } from '@prisma/client';

export enum DisputeCategory {
  FAMILY = 'FAMILY',
  CIVIL = 'CIVIL',
  LABOR = 'LABOR',
  BUSINESS = 'BUSINESS',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
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
  @IsString() @MinLength(2) @MaxLength(100) region: string;
}

export class ConsentDto {
  @IsEnum(ParticipantSide) side: ParticipantSide;
  @IsEnum(['CONSENTED', 'DECLINED'] as const) status: 'CONSENTED' | 'DECLINED';
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
