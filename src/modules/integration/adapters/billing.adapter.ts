import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { BillingCallbackDto } from '../dto/billing-callback.dto';
import { IntegrationDirection, IntegrationStatus, PaymentStatus, Prisma } from '@prisma/client';

export interface IBillingPort {
  createInvoice(params: {
    userId: string;
    amount: number;
    serviceType: string;
    payerPinfl?: string;
    payerName?: string;
  }): Promise<{ invoiceNumber: string; qrCodeUrl: string }>;
  handleCallback(callback: BillingCallbackDto): Promise<{ success: boolean; message: string }>;
}

@Injectable()
export class BillingIntegrationAdapter implements IBillingPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
  ) {}

  async createInvoice(params: {
    userId: string;
    amount: number;
    serviceType: string;
    payerPinfl?: string;
    payerName?: string;
  }) {
    return this.loggerService.executeWithResilience(
      async () => {
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const transaction = await this.prisma.billingTransaction.create({
          data: {
            invoiceNumber,
            userId: params.userId,
            amount: new Prisma.Decimal(params.amount),
            serviceType: params.serviceType,
            payerPinfl: params.payerPinfl,
            payerName: params.payerName,
            paymentStatus: PaymentStatus.PENDING,
          },
        });

        return {
          invoiceNumber: transaction.invoiceNumber,
          qrCodeUrl: `https://billing.adliya.uz/qr/${transaction.invoiceNumber}`,
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
      // Find or create transaction record
      let transaction = await this.prisma.billingTransaction.findUnique({
        where: { invoiceNumber: callback.invoiceNumber },
      });

      if (!transaction) {
        transaction = await this.prisma.billingTransaction.create({
          data: {
            invoiceNumber: callback.invoiceNumber,
            transactionId: callback.transactionId,
            amount: new Prisma.Decimal(callback.amount),
            serviceType: 'MEDIATION_FEE',
            paymentProvider: callback.paymentProvider,
            paymentStatus: callback.paymentStatus,
            paidAt: callback.paidAt ? new Date(callback.paidAt) : new Date(),
            payerPinfl: callback.payerPinfl,
            payerName: callback.payerName,
          },
        });
      } else {
        transaction = await this.prisma.billingTransaction.update({
          where: { invoiceNumber: callback.invoiceNumber },
          data: {
            transactionId: callback.transactionId,
            paymentStatus: callback.paymentStatus,
            paymentProvider: callback.paymentProvider,
            paidAt: callback.paidAt ? new Date(callback.paidAt) : new Date(),
          },
        });
      }

      await this.loggerService.log({
        serviceName: 'BILLING_GATEWAY',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.SUCCESS,
        endpoint: '/external/billing/callback',
        request: callback,
        response: { transactionId: transaction.id, status: transaction.paymentStatus },
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

      throw new BadRequestException(`Billing callback xatosi: ${err.message}`);
    }
  }
}
