import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber() @Min(0) amount: number;
  @IsString() @MaxLength(100) serviceType: string;
  @IsString() @MaxLength(200) idempotencyKey: string;
  @IsOptional() metadata?: Record<string, unknown>;
}

export class PaymentQueryDto {
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() organizationId?: string;
}
