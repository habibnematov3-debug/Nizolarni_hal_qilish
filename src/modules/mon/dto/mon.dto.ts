import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateObligationDto {
  @IsString() @MaxLength(100) agreementId: string;
  @IsString() @MaxLength(2000) description: string;
  @IsDateString() dueDate: string;
  @IsOptional() @IsUUID() responsiblePartyId?: string;
  @IsString() @MaxLength(300) responsiblePartyName: string;
  @IsOptional() @IsString() mediatorId?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsInt() @Min(0) @Max(365) reminderDaysBefore?: number;
  @IsOptional() @IsInt() @Min(1) @Max(30) reminderIntervalDays?: number;
}

export class ObligationQueryDto {
  @IsOptional() @IsString() agreementId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() mediatorId?: string;
  @IsOptional() @IsString() region?: string;
}
