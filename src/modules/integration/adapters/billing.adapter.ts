import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { BillingCallbackDto } from '../dto/billing-callback.dto';
import { IntegrationDirection, IntegrationStatus, PaymentStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EventsHandlerService } from '../../notifications/services/events-handler.service';

export interface IBillingPort {
  createInvoice(params: {
    userId: string;
    amount: number;
    serviceType: string;
    payerPinfl?: string;
    payerName?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ invoiceNumber: string; qrCodeUrl: string }>;
  handleCallback(callback: BillingCallbackDto): Promise<{ success: boolean; message: string }>;
}

@Injectable()
export class BillingIntegrationAdapter implements IBillingPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
    private readonly eventsHandler: EventsHandlerService,
  ) {}

  async createInvoice(params: {
    userId: string;
    amount: number;
    serviceType: string;
    payerPinfl?: string;
    payerName?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }) {
    if (params.idempotencyKey) {
      const existing = await this.prisma.billingTransaction.findFirst({ where: { idempotencyKey: params.idempotencyKey } });
      if (existing) {
        if (existing.userId !== params.userId || !existing.amount.equals(new Prisma.Decimal(params.amount)) || existing.serviceType !== params.serviceType) {
          throw new ConflictException('Idempotency kaliti boshqa to‘lov so‘rovida ishlatilgan');
        }
        const savedQr = (existing.metadata as Record<string, unknown> | null)?.billingQrCodeUrl;
        return { invoiceNumber: existing.invoiceNumber, qrCodeUrl: typeof savedQr === 'string' ? savedQr : `https://billing.adliya.uz/qr/${existing.invoiceNumber}` };
      }
    }
    const localInvoiceNumber = `INV-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const endpoint = process.env.BILLING_API_URL;
    return this.loggerService.executeWithResilience(
      async () => {
        let invoiceNumber = localInvoiceNumber;
        let qrCodeUrl = `https://billing.adliya.uz/qr/${localInvoiceNumber}`;
        if (endpoint) {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'idempotency-key': params.idempotencyKey || localInvoiceNumber,
              ...(process.env.BILLING_API_TOKEN ? { authorization: `Bearer ${process.env.BILLING_API_TOKEN}` } : {}),
            },
            body: JSON.stringify({ ...params, invoiceNumber: localInvoiceNumber, currency: 'UZS' }),
          });
          if (!response.ok) throw new Error(`Billing invoice API ${response.status} javobini qaytardi`);
          const result = await response.json() as { invoiceNumber?: string; qrCodeUrl?: string };
          if (!result.invoiceNumber || !result.qrCodeUrl) throw new Error('Billing invoice API javobi invoiceNumber yoki qrCodeUrl maydoniga ega emas');
          invoiceNumber = result.invoiceNumber;
          qrCodeUrl = result.qrCodeUrl;
        } else if (process.env.NODE_ENV === 'production') {
          throw new Error('Production billing uchun BILLING_API_URL sozlanmagan');
        }

        const transaction = await this.prisma.billingTransaction.create({
          data: {
            invoiceNumber,
            userId: params.userId,
            amount: new Prisma.Decimal(params.amount),
            serviceType: params.serviceType,
            payerPinfl: params.payerPinfl,
            payerName: params.payerName,
            paymentStatus: PaymentStatus.PENDING,
            idempotencyKey: params.idempotencyKey,
            metadata: { ...(params.metadata || {}), billingQrCodeUrl: qrCodeUrl },
          },
        });

        return {
          invoiceNumber: transaction.invoiceNumber,
          qrCodeUrl,
        };
      },
      {
        serviceName: 'BILLING_GATEWAY',
        endpoint: '/api/v1/invoices/create',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      params,
    );
  }

  async handleCallback(callback: BillingCallbackDto) {
    const startTime = Date.now();
    try {
      this.verifyCallbackSignature(callback);
      const transaction = await this.prisma.billingTransaction.findUnique({
        where: { invoiceNumber: callback.invoiceNumber },
      });
      if (!transaction) {
        throw new BadRequestException('Billing callback uchun invoys topilmadi');
      }
      if (!transaction.amount.equals(new Prisma.Decimal(callback.amount))) {
        throw new ConflictException('Billing callback summasi yaratilgan invoys summasiga mos kelmadi');
      }
      if (transaction.paymentStatus === PaymentStatus.PAID && (callback.paymentStatus === PaymentStatus.PENDING || callback.paymentStatus === PaymentStatus.FAILED)) {
        throw new ConflictException('Tasdiqlangan to‘lov holatini orqaga qaytarib bo‘lmaydi');
      }
      if (transaction.paymentStatus === PaymentStatus.REFUNDED && callback.paymentStatus !== PaymentStatus.REFUNDED) {
        throw new ConflictException('Qaytarilgan to‘lovni avvalgi holatga qaytarib bo‘lmaydi');
      }
      if (transaction.paymentStatus === PaymentStatus.PAID && transaction.transactionId && transaction.transactionId !== callback.transactionId) {
        throw new ConflictException('Invoys boshqa billing tranzaksiyasi bilan to‘langan');
      }
      const updatedTransaction = await this.prisma.billingTransaction.update({
          where: { invoiceNumber: callback.invoiceNumber },
          data: {
            transactionId: callback.transactionId,
            paymentStatus: callback.paymentStatus,
            paymentProvider: callback.paymentProvider,
            paidAt: callback.paymentStatus === PaymentStatus.PAID ? (callback.paidAt ? new Date(callback.paidAt) : new Date()) : null,
          },
        });

      if (updatedTransaction.paymentStatus === PaymentStatus.PAID && transaction.paymentStatus !== PaymentStatus.PAID && updatedTransaction.userId) {
        void this.eventsHandler.handleEvent({
          eventName: 'TolovTasdiqlandi',
          sourceModule: 'TOL',
          userId: updatedTransaction.userId,
          variables: { invoiceNumber: updatedTransaction.invoiceNumber, caseNumber: updatedTransaction.invoiceNumber, amount: updatedTransaction.amount.toString(), serviceType: updatedTransaction.serviceType, metadata: updatedTransaction.metadata },
        }).catch(() => undefined);
      }

      await this.loggerService.log({
        serviceName: 'BILLING_GATEWAY',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.SUCCESS,
        endpoint: '/external/billing/callback',
        request: callback,
        response: { transactionId: updatedTransaction.id, status: updatedTransaction.paymentStatus },
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'To\'lov holati muvaffaqiyatli qabul qilindi va qayta ishlandi',
      };
    } catch (err) {
      await this.loggerService.log({
        serviceName: 'BILLING_GATEWAY',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.FAILED,
        endpoint: '/external/billing/callback',
        request: callback,
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      if (err instanceof UnauthorizedException || err instanceof ConflictException || err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Billing callback xatosi: ${err.message}`);
    }
  }

  async reconcileInvoice(invoiceNumber: string) {
    const endpoint = process.env.BILLING_STATUS_API_URL;
    if (!endpoint) {
      if (process.env.NODE_ENV === 'production') throw new BadRequestException('Production billing holati uchun BILLING_STATUS_API_URL sozlanmagan');
      const transaction = await this.prisma.billingTransaction.findUnique({ where: { invoiceNumber } });
      if (!transaction) throw new BadRequestException('Billing invoysi topilmadi');
      return { invoiceNumber, paymentStatus: transaction.paymentStatus, checkedWithProvider: false };
    }
    const url = endpoint.includes(':invoiceNumber')
      ? endpoint.replace(':invoiceNumber', encodeURIComponent(invoiceNumber))
      : `${endpoint.replace(/\/$/, '')}/${encodeURIComponent(invoiceNumber)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(process.env.BILLING_API_TOKEN ? { authorization: `Bearer ${process.env.BILLING_API_TOKEN}` } : {}),
      },
    });
    if (!response.ok) throw new BadRequestException(`Billing holati API ${response.status} javobini qaytardi`);
    const callback = await response.json() as BillingCallbackDto;
    if (!callback || callback.invoiceNumber !== invoiceNumber || typeof callback.amount !== 'number' || !callback.transactionId || !callback.paymentProvider || !Object.values(PaymentStatus).includes(callback.paymentStatus)) {
      throw new BadRequestException('Billing holati API javobi yaroqsiz');
    }
    await this.handleCallback(callback);
    return { invoiceNumber, paymentStatus: callback.paymentStatus, checkedWithProvider: true };
  }

  private verifyCallbackSignature(callback: BillingCallbackDto) {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') throw new UnauthorizedException('BILLING_WEBHOOK_SECRET sozlanmagan');
      return;
    }
    const signature = callback.signature || '';
    const canonicalPayload = [
      callback.invoiceNumber,
      callback.transactionId,
      callback.amount.toFixed(2),
      callback.paymentStatus,
      callback.paymentProvider,
      callback.paidAt || '',
      callback.payerPinfl || '',
      callback.payerName || '',
    ].join('\n');
    const expected = createHmac('sha256', secret).update(canonicalPayload).digest('hex');
    const suppliedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Billing callback imzosi noto‘g‘ri');
    }
  }
}
