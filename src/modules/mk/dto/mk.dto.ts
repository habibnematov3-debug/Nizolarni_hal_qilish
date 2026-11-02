import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength, Min, Max, ArrayNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateMkApplicationDto {
  @IsString() @MaxLength(30) phone: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsString() @MinLength(2) @MaxLength(160) region: string;
  @IsString() @MinLength(2) @MaxLength(250) education: string;
  @IsIn(['MEDIATOR', 'NOTARY', 'ADVOCATE']) profession: 'MEDIATOR' | 'NOTARY' | 'ADVOCATE';
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) specialization: string[];
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) languages: string[];
  @IsOptional() @IsArray() @IsObject({ each: true }) workExperience?: Record<string, unknown>[];
  @IsBoolean() ethicsAccepted: boolean;
  @IsOptional() @IsUUID() diplomaFileId?: string;
  @IsOptional() @IsUUID() passportFileId?: string;
  @IsOptional() @IsUUID() courseCertificateId?: string;
  @IsOptional() @IsUUID() professionProofFileId?: string;
}

export class ReviewMkApplicationDto {
  @IsIn(['LEGAL_INELIGIBILITY', 'CORRECTIONS_NOT_FIXED', 'FAILED_EXAM_WAITING_PERIOD', 'QUALIFICATION_EXAM_FAILED']) rejectionCode: string;
  @IsOptional() @IsString() @MaxLength(2000) rejectionReason?: string;
}

export class RequestMkCorrectionDto {
  @IsString() @MinLength(5) @MaxLength(2000) note: string;
}

export class ResubmitMkApplicationDto extends PartialType(CreateMkApplicationDto) {
  @IsString() @MinLength(3) @MaxLength(2000) correctionResponse: string;
}

export class RegisterMkApplicantDto {
  @IsString() @MinLength(1) @MaxLength(80) registryNumber: string;
}

export class InviteToExamDto {
  @IsDateString() scheduledAt: string;
  @IsString() @MaxLength(500) venue: string;
  @IsString() @MaxLength(30) secretaryPhone: string;
  @IsOptional() @IsNumber() @Min(1) @Max(100) questionCount?: number;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) streamUrl?: string;
}

export class SubmitScoreDto {
  @IsNumber() @Min(0) @Max(100) score: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class CreateQuestionDto {
  @IsString() @MaxLength(5000) text: string;
  @IsArray() options: string[];
  @IsOptional() @IsString() correctOption?: string;
}

export class QueryMkApplicationsDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
}

export class CreateCommitteeMemberDto {
  @IsUUID() userId: string;
  @IsString() role: 'SECRETARY' | 'MEMBER';
}

export class AssignCommitteeMemberDto {
  @IsUUID() memberId: string;
}
