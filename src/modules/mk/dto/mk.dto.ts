import { IsArray, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';

export class CreateMkApplicationDto {
  @IsString() @MaxLength(30) phone: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsIn(['MEDIATOR', 'NOTARY', 'ADVOCATE']) profession: 'MEDIATOR' | 'NOTARY' | 'ADVOCATE';
  @IsUUID() diplomaFileId: string;
  @IsOptional() @IsUUID() passportFileId?: string;
  @IsOptional() @IsUUID() courseCertificateId?: string;
  @IsOptional() @IsUUID() professionProofFileId?: string;
}

export class ReviewMkApplicationDto {
  @IsOptional() @IsString() @MaxLength(2000) rejectionReason?: string;
}

export class InviteToExamDto {
  @IsDateString() scheduledAt: string;
  @IsString() @MaxLength(500) venue: string;
  @IsString() @MaxLength(30) secretaryPhone: string;
  @IsOptional() @IsNumber() @Min(1) @Max(100) questionCount?: number;
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
