import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { DisciplineSanctionType } from '@prisma/client';

export class CreateDisciplineCaseDto {
  @IsUUID() mediatorId: string;
  @IsString() @MaxLength(10000) description: string;
}

export class QueryDisciplineCasesDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsInt() @Min(18) @Max(120) age?: number;
  @IsOptional() @IsInt() @Min(1900) @Max(2200) registeredYear?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() sanctionType?: string;
}

export class CreateDecisionDto {
  @IsEnum(DisciplineSanctionType) sanctionType: DisciplineSanctionType;
  @IsString() effectiveFrom: string;
  @IsOptional() @IsString() effectiveTo?: string;
  @IsOptional() @IsString() @MaxLength(5000) commissionNotes?: string;
}

export class AddDisciplineDocumentDto {
  @IsString() @MaxLength(500) fileName: string;
  @IsString() fileUrl: string;
  @IsInt() @Min(1) fileSize: number;
  @IsString() mimeType: string;
}
