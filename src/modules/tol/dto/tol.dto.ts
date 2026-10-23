import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber() @Min(1) amount: number;
  @IsString() @MaxLength(100) serviceType: string;
  @IsString() @MinLength(8) @MaxLength(200) idempotencyKey: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class CreateExamFeeDto {
  @ApiProperty({ description: 'Qabul qilingan mediator bo‘lish arizasi UUID si' })
  @IsUUID() applicationId: string;

  @ApiProperty({ description: 'Bir mantiqiy to‘lov urinishini takroriy yuborishdan himoya qiluvchi kalit' })
  @IsString() @MinLength(8) @MaxLength(200) idempotencyKey: string;
}

export class PaymentQueryDto {
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() organizationId?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
