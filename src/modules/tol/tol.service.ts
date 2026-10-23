import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MkApplicationStatus, PaymentStatus, Prisma } from '@prisma/client';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingIntegrationAdapter } from '../integration/adapters/billing.adapter';
import { CreateExamFeeDto, CreatePaymentDto, PaymentQueryDto } from './dto/tol.dto';

type ExamPaymentSettings = {
  examFeeAmount?: number | null;
  examFeeBeneficiaryName?: string | null;
  examFeeBeneficiaryAccount?: string | null;
  examFeeBeneficiaryBankCode?: string | null;
  examFeeBeneficiaryRegion?: string | null;
};

@Injectable()
export class TolService {
  constructor(private readonly prisma: PrismaService, private readonly billing: BillingIntegrationAdapter) {}

  async createPayment(user: AuthUser, dto: CreatePaymentDto) {
    const result = await this.billing.createInvoice({
      userId: user.id,
      amount: dto.amount,
      serviceType: dto.serviceType,
      payerPinfl: user.pinfl || undefined,
      payerName: user.fullName,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
    return { ...result, serviceType: dto.serviceType, amount: dto.amount, currency: 'UZS' };
  }

  async createExamFee(user: AuthUser, dto: CreateExamFeeDto) {
    const application = await this.prisma.mkApplication.findFirst({
      where: { id: dto.applicationId, applicantId: user.id },
      select: { id: true, status: true },
    });
    if (!application) throw new NotFoundException('O‘zingizga tegishli malaka imtihoni arizasi topilmadi');
    if (application.status !== MkApplicationStatus.ACCEPTED) {
      throw new ConflictException('Imtihon to‘lovi ariza qabul qilingandan keyin, imtihonga taklif yuborilishidan oldin amalga oshiriladi');
    }

    const stored = await this.prisma.systemSetting.findUnique({ where: { key: 'paymentSettings' }, select: { value: true } });
    const settings = { ...(stored?.value as ExamPaymentSettings | null), examFeeAmount: (stored?.value as ExamPaymentSettings | null)?.examFeeAmount ?? (process.env.MK_EXAM_FEE_AMOUNT ? Number(process.env.MK_EXAM_FEE_AMOUNT) : null) };
    if (!settings.examFeeAmount || !Number.isFinite(settings.examFeeAmount) || settings.examFeeAmount <= 0) {
      throw new ConflictException('Malaka imtihoni to‘lovi admin sozlamalarida belgilanmagan');
    }
    if (!settings.examFeeBeneficiaryName || !settings.examFeeBeneficiaryAccount || !settings.examFeeBeneficiaryBankCode) {
      throw new ConflictException('Imtihon to‘lovini oluvchi adliya organi rekvizitlari sozlanmagan');
    }

    const idempotencyKey = `TOL:EXAM:${application.id}:${dto.idempotencyKey}`;
    const existingPaid = await this.prisma.billingTransaction.findFirst({
      where: {
        userId: user.id,
        serviceType: 'QUALIFICATION_EXAM_FEE',
        paymentStatus: PaymentStatus.PAID,
        metadata: { path: ['applicationId'], equals: application.id },
      },
    });
    if (existingPaid) throw new ConflictException({ message: 'Ushbu imtihon arizasi uchun to‘lov tasdiqlangan', invoiceNumber: existingPaid.invoiceNumber });

    const beneficiary = {
      name: settings.examFeeBeneficiaryName,
      account: settings.examFeeBeneficiaryAccount,
      bankCode: settings.examFeeBeneficiaryBankCode,
      region: settings.examFeeBeneficiaryRegion || user.region || null,
    };
    const result = await this.billing.createInvoice({
      userId: user.id,
      amount: settings.examFeeAmount,
      serviceType: 'QUALIFICATION_EXAM_FEE',
      payerPinfl: user.pinfl || undefined,
      payerName: user.fullName,
      idempotencyKey,
      metadata: { module: 'TOL', applicationId: application.id, beneficiary, beneficiaryRegion: beneficiary.region },
    });
    return { ...result, amount: settings.examFeeAmount, currency: 'UZS', serviceType: 'QUALIFICATION_EXAM_FEE', beneficiary };
  }

  async history(user: AuthUser, query: PaymentQueryDto) {
    const where: Prisma.BillingTransactionWhereInput = { userId: user.id };
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.status) where.paymentStatus = query.status;
    if (query.from || query.to) where.createdAt = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [total, items] = await Promise.all([
      this.prisma.billingTransaction.count({ where }),
      this.prisma.billingTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async detail(user: AuthUser, paymentId: string) {
    const item = await this.prisma.billingTransaction.findFirst({ where: { OR: [{ id: paymentId }, { invoiceNumber: paymentId }] } });
    if (!item) throw new NotFoundException('To‘lov invoysi topilmadi');
    if (item.userId !== user.id && !user.roles.includes('ADMIN')) throw new ForbiddenException('To‘lov sizga tegishli emas');
    return item;
  }

  async reconcile(user: AuthUser, paymentId: string) {
    const item = await this.detail(user, paymentId);
    await this.billing.reconcileInvoice(item.invoiceNumber);
    return this.detail(user, item.invoiceNumber);
  }

  async report(user: AuthUser, query: PaymentQueryDto, format: 'json' | 'csv') {
    const where: Prisma.BillingTransactionWhereInput = {};
    if (query.serviceType) where.serviceType = query.serviceType;
    if (query.status) where.paymentStatus = query.status;
    if (query.from || query.to) where.createdAt = { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined };

    if (user.roles.includes('REGIONAL_STAFF')) {
      const region = user.region || user.organization?.region;
      if (!region) where.userId = { in: [] };
      else {
        const users = await this.prisma.user.findMany({ where: { organization: { is: { region } } }, select: { id: true } });
        where.AND = [
          ...(where.AND || []),
          { OR: [
            { userId: { in: users.map((item) => item.id) } },
            { metadata: { path: ['beneficiaryRegion'], equals: region } },
          ] },
        ];
      }
      if (query.organizationId && query.organizationId !== user.organizationId) throw new ForbiddenException('Boshqa hudud yoki tashkilot to‘lov hisobotini ko‘rish mumkin emas');
    } else if (!user.roles.includes('ADMIN') && !user.roles.includes('MINISTRY_STAFF')) {
      throw new ForbiddenException('To‘lovlar hisobotiga kirish huquqi yo‘q');
    } else if (query.organizationId) {
      const users = await this.prisma.user.findMany({ where: { organizationId: query.organizationId }, select: { id: true } });
      where.userId = { in: users.map((item) => item.id) };
    }

    const items = await this.prisma.billingTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
    const summary = {
      total: items.length,
      paid: items.filter((item) => item.paymentStatus === PaymentStatus.PAID).length,
      pending: items.filter((item) => item.paymentStatus === PaymentStatus.PENDING).length,
      failed: items.filter((item) => item.paymentStatus === PaymentStatus.FAILED).length,
      amountPaid: items.filter((item) => item.paymentStatus === PaymentStatus.PAID).reduce((sum, item) => sum + Number(item.amount), 0),
    };
    if (format === 'csv') {
      const rows = ['invoiceNumber,userId,serviceType,amount,status,paymentProvider,createdAt,paidAt', ...items.map((item) => [item.invoiceNumber, item.userId || '', item.serviceType, item.amount.toString(), item.paymentStatus, item.paymentProvider || '', item.createdAt.toISOString(), item.paidAt?.toISOString() || ''].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))];
      return { contentType: 'text/csv; charset=utf-8', filename: 'tol-payments.csv', body: rows.join('\n') };
    }
    return { contentType: 'application/json; charset=utf-8', body: JSON.stringify({ summary, items }) };
  }
}
