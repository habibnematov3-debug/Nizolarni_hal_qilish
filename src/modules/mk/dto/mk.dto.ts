import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, IsUrl, MaxLength, MinLength, Min, Max, ArrayNotEmpty, ArrayMaxSize, Matches, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const optionalText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || undefined : value;

export class WorkExperienceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) startedAt: string;
  @Transform(optionalText) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) endedAt?: string;
  @IsOptional() @IsBoolean() isCurrent?: boolean;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(250) workplace: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(250) position: string;
}

export class CreateMkApplicationDto {
  @IsString() @MaxLength(30) phone: string;
  @Transform(optionalText) @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(1000) address: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(1000) practiceAddress: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(250) passportIssuedBy: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) birthDate?: string;
  @IsString() @MinLength(2) @MaxLength(160) region: string;
  @Transform(optionalText) @IsOptional() @IsString() @MinLength(2) @MaxLength(250) education?: string;
  @IsIn(['MEDIATOR', 'NOTARY', 'ADVOCATE']) profession: 'MEDIATOR' | 'NOTARY' | 'ADVOCATE';
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) specialization: string[];
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) languages: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => WorkExperienceDto) workExperience?: WorkExperienceDto[];
  @IsBoolean() ethicsAccepted: boolean;
  @IsOptional() @IsUUID() diplomaFileId?: string;
  @IsOptional() @IsUUID() passportFileId?: string;
  @IsOptional() @IsUUID() courseCertificateId?: string;
  @IsOptional() @IsUUID() professionProofFileId?: string;
  @IsOptional() @IsUUID() powerOfAttorneyFileId?: string;
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

export class CreateTrainingCourseDto {
  @IsString() @MinLength(3) @MaxLength(160) title: string;
  @IsIn(['COURSE', 'WEBINAR']) type: 'COURSE' | 'WEBINAR';
  @IsNumber() @Min(1) @Max(500) durationHours: number;
  @IsString() @MinLength(3) @MaxLength(100) dateLabel: string;
  @IsString() @MinLength(5) @MaxLength(2000) description: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) joinUrl?: string;
}

export class MarkTrainingAttendanceDto {
  @IsBoolean() attended: boolean;
  @IsOptional() @IsBoolean() completed?: boolean;
}
