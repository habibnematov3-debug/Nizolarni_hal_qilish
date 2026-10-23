import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { MediationType, ParticipantSide, MedResultStatus } from '@prisma/client';

export class CreateMediationDto {
  @IsOptional() @IsString() courtCaseNumber?: string;
  @IsEnum(MediationType) type: MediationType;
  @IsString() @MaxLength(3000) disputeSubject: string;
  @IsString() claimantName: string;
  @IsOptional() @IsString() claimantPhone?: string;
  @IsOptional() @IsString() claimantPinfl?: string;
  @IsString() respondentName: string;
  @IsOptional() @IsUUID() respondentUserId?: string;
  @IsOptional() @IsString() respondentPhone?: string;
  @IsOptional() @IsString() respondentPinfl?: string;
}

export class ConsentDto {
  @IsEnum(ParticipantSide) side: ParticipantSide;
  @IsEnum(['CONSENTED', 'DECLINED'] as const) status: 'CONSENTED' | 'DECLINED';
}

export class SelectMediatorDto { @IsUUID() mediatorId: string; }

export class SignAgreementDto {
  @IsString() side: ParticipantSide | 'MEDIATOR';
  @IsOptional() @IsString() pkcs7?: string;
}

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
