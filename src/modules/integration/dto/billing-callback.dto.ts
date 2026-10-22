import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class BillingCallbackDto {
  @ApiProperty({ example: 'INV-2026-10045', description: 'Invoys raqami' })
  @IsNotEmpty({ message: 'Invoys raqami kiritilishi shart' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ example: 'TXN_MUNIS_98765432', description: 'To\'lov tizimi tranzaksiya ID si' })
  @IsNotEmpty({ message: 'Tranzaksiya ID si kiritilishi shart' })
  @IsString()
  transactionId: string;

  @ApiProperty({ example: 340000, description: 'To\'langan summa (so\'mda)' })
  @IsNotEmpty({ message: 'To\'lov summasi kiritilishi shart' })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
    description: 'To\'lov holati: PENDING, PAID, FAILED, REFUNDED',
  })
  @IsNotEmpty({ message: 'To\'lov holati kiritilishi shart' })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 'MUNIS', description: 'To\'lov provayderi (MUNIS, PAYME, CLICK, TREASURY)' })
  @IsNotEmpty({ message: 'To\'lov provayderi kiritilishi shart' })
  @IsString()
  paymentProvider: string;

  @ApiPropertyOptional({ example: '2026-10-22T15:30:00.000Z', description: 'To\'lov amalga oshirilgan vaqt' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: '31201851230044', description: 'To\'lovchi JShShIR' })
  @IsOptional()
  @IsString()
  payerPinfl?: string;

  @ApiPropertyOptional({ example: 'Jamshid Nodirov', description: 'To\'lovchi ismi' })
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional({ description: 'Elektron imzo yoki xavfsizlik heshi' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Qo\'shimcha parametrlar' })
  @IsOptional()
  metadata?: any;
}
