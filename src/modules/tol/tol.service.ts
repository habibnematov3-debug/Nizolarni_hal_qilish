import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingIntegrationAdapter } from '../integration/adapters/billing.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreatePaymentDto, PaymentQueryDto } from './dto/tol.dto';
import { PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class TolService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingIntegrationAdapter) {}

  async createPayment(user: AuthUser, dto: CreatePaymentDto) {
    const result = await this.billing.createInvoice({ userId: user.id, amount: dto.amount, serviceType: dto.serviceType, payerPinfl: user.pinfl || undefined, payerName: user.fullName, idempotencyKey: dto.idempotencyKey });
    return { ...result, serviceType: dto.serviceType, amount: dto.amount };
  }

  async history(user: AuthUser, query: PaymentQueryDto) {
    const where: Prisma.BillingTransactionWhereInput = { userId: user.id };
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.status) where.paymentStatus = query.status;
    return this.prisma.billingTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async detail(user: AuthUser, invoiceNumber: string) {
    const item = await this.prisma.billingTransaction.findUnique({ where: { invoiceNumber } });
    if (!item) throw new NotFoundException('To\'lov invoysi topilmadi');
    if (item.userId !== user.id && !user.roles.includes('ADMIN')) throw new ForbiddenException('To\'lov sizga tegishli emas');
    return item;
  }

  async report(user: AuthUser, query: PaymentQueryDto, format: 'json' | 'csv') {
    const where: Prisma.BillingTransactionWhereInput = {};
    if (!user.roles.includes('MINISTRY_STAFF') && !user.roles.includes('ADMIN')) {
      const users = await this.prisma.user.findMany({ where: { organizationId: user.organizationId || undefined }, select: { id: true } });
      where.userId = { in: users.map((item) => item.id) };
    } else if (query.organizationId) {
      const users = await this.prisma.user.findMany({ where: { organizationId: query.organizationId }, select: { id: true } });
      where.userId = { in: users.map((item) => item.id) };
    }
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.status) where.paymentStatus = query.status;
    if (query.from || query.to) where.createdAt = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };
    const items = await this.prisma.billingTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
    const summary = { total: items.length, paid: items.filter((item) => item.paymentStatus === PaymentStatus.PAID).length, pending: items.filter((item) => item.paymentStatus === PaymentStatus.PENDING).length, failed: items.filter((item) => item.paymentStatus === PaymentStatus.FAILED).length, amountPaid: items.filter((item) => item.paymentStatus === PaymentStatus.PAID).reduce((sum, item) => sum + Number(item.amount), 0) };
    if (format === 'csv') {
      const rows = ['invoiceNumber,userId,serviceType,amount,status,createdAt', ...items.map((item) => [item.invoiceNumber, item.userId || '', item.serviceType, item.amount.toString(), item.paymentStatus, item.createdAt.toISOString()].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))];
      return { contentType: 'text/csv; charset=utf-8', filename: 'tol-payments.csv', body: rows.join('\n') };
    }
    return { contentType: 'application/json; charset=utf-8', body: JSON.stringify({ summary, items }) };
  }
}
