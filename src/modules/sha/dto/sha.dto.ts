import { ContractPartyRole, ContractTemplateStatus, ContractType, ServiceContractStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ContractPartyInputDto {
  @ApiProperty({ enum: [ContractPartyRole.CLIENT, ContractPartyRole.COUNTERPARTY] })
  @IsEnum([ContractPartyRole.CLIENT, ContractPartyRole.COUNTERPARTY])
  role: 'CLIENT' | 'COUNTERPARTY';

  @ApiPropertyOptional({ description: 'Mavjud foydalanuvchi ID si; berilmasa PINFL orqali aniqlanishi mumkin' })
  @IsOptional() @IsUUID() userId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(14) pinfl?: string;

  @ApiPropertyOptional({ description: 'Hisobi yo‘q taraf uchun ism; bog‘langan akkaunt bo‘lsa profildan olinadi' })
  @IsOptional() @IsString() @MaxLength(250) fullName?: string;
}

export class CreateContractDto {
  @ApiProperty({ enum: ContractType }) @IsEnum(ContractType) type: ContractType;
  @ApiProperty() @IsUUID() templateId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() providerUserId?: string;
  @ApiProperty() @IsString() @MaxLength(250) title: string;
  @ApiProperty() @IsString() @MaxLength(10000) caseSummary: string;
  @ApiProperty() @IsString() @MaxLength(10000) rightsAndResponsibilities: string;
  @ApiProperty() @IsString() @MaxLength(10000) terms: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
  @ApiProperty({ type: [ContractPartyInputDto], minItems: 1, maxItems: 2 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique((party: ContractPartyInputDto) => party.role)
  @ValidateNested({ each: true }) @Type(() => ContractPartyInputDto)
  participants: ContractPartyInputDto[];
}

export class UpdateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) caseSummary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) rightsAndResponsibilities?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) terms?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string | null;
}

export class ContractQueryDto {
  @ApiPropertyOptional({ enum: ServiceContractStatus }) @IsOptional() @IsEnum(ServiceContractStatus) status?: ServiceContractStatus;
  @ApiPropertyOptional({ enum: ContractType }) @IsOptional() @IsEnum(ContractType) type?: ContractType;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ContractDecisionDto {
  @ApiPropertyOptional({ maxLength: 2000 }) @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class SignContractDto {
  @ApiProperty({ description: 'E-imzo PKCS#7 imzo paketi, Base64' })
  @IsString() @MaxLength(1000000) pkcs7: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsNumber() @Min(1) @Max(100000000000) amount: number;
}

export class CreateContractTemplateDto {
  @ApiProperty({ enum: ContractType }) @IsEnum(ContractType) type: ContractType;
  @ApiProperty() @IsString() @MaxLength(250) name: string;
  @ApiProperty({ description: 'Matn, {{title}}, {{caseSummary}}, {{rightsAndResponsibilities}}, {{terms}}, {{providerName}} o‘rinbosarlari ishlatilishi mumkin' })
  @IsString() @MaxLength(50000) content: string;
}

export class UpdateContractTemplateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50000) content?: string;
  @ApiPropertyOptional({ enum: ContractTemplateStatus }) @IsOptional() @IsEnum(ContractTemplateStatus) status?: ContractTemplateStatus;
}

export class MediatorBankDetailsDto {
  @ApiProperty() @IsString() @MaxLength(250) accountHolder: string;
  @ApiProperty() @IsString() @MaxLength(50) accountNumber: string;
  @ApiProperty() @IsString() @MaxLength(250) bankName: string;
  @ApiProperty() @IsString() @MaxLength(20) bankCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) taxId?: string;
}
