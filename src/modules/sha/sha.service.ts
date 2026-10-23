import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractPartyRole,
  ContractPartyStatus,
  ContractTemplateStatus,
  ContractType,
  PaymentStatus,
  Prisma,
  RegistryStatus,
  ServiceContractStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { BillingIntegrationAdapter } from '../integration/adapters/billing.adapter';
import { EsignIntegrationAdapter } from '../integration/adapters/esign.adapter';
import {
  ContractDecisionDto,
  ContractPartyInputDto,
  ContractQueryDto,
  CreateContractDto,
  CreateContractTemplateDto,
  CreateInvoiceDto,
  MediatorBankDetailsDto,
  UpdateContractDto,
  UpdateContractTemplateDto,
} from './dto/sha.dto';

const PROVIDER_REGISTRY_STATUS: Record<ContractType, RegistryStatus> = {
  [ContractType.MEDIATION]: RegistryStatus.MEDIATOR,
  [ContractType.ARBITRATION]: RegistryStatus.ARBITRATOR,
  [ContractType.ARBITRATION_HEARING]: RegistryStatus.ARBITRATION_JUDGE,
};

@Injectable()
export class ShaService {
  private readonly logger = new Logger(ShaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly billing: BillingIntegrationAdapter,
    private readonly esign: EsignIntegrationAdapter,
  ) {}

  async listContracts(actor: AuthUser, query: ContractQueryDto) {
    const where: Prisma.ServiceContractWhereInput = this.accessWhere(actor);
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { contractNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { caseSummary: { contains: query.search, mode: 'insensitive' } },
        { participants: { some: { fullName: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [total, contracts] = await Promise.all([
      this.prisma.serviceContract.count({ where }),
      this.prisma.serviceContract.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          contractNumber: true,
          type: true,
          title: true,
          status: true,
          validUntil: true,
          sentAt: true,
          signedAt: true,
          createdAt: true,
          updatedAt: true,
          provider: { select: { id: true, fullName: true } },
          participants: { select: { role: true, fullName: true, status: true, signedAt: true } },
          invoices: { select: { id: true, invoiceNumber: true, amount: true, sentAt: true, billingTransaction: { select: { paymentStatus: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return { items: contracts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async statistics(actor: AuthUser) {
    const entries = await this.prisma.serviceContract.findMany({
      where: this.accessWhere(actor),
      select: { status: true, validUntil: true },
    });
    const byStatus: Record<string, number> = {};
    const now = new Date();
    let expired = 0;
    for (const entry of entries) {
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
      if (entry.validUntil && entry.validUntil < now && entry.status === ServiceContractStatus.SIGNED) expired++;
    }
    return { total: entries.length, expired, byStatus };
  }

  async getContract(actor: AuthUser, id: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    return this.safeContract(contract);
  }

  async createContract(actor: AuthUser, dto: CreateContractDto, ipAddress?: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id: dto.templateId, type: dto.type, status: ContractTemplateStatus.PUBLISHED },
    });
    if (!template) throw new BadRequestException('Tanlangan tur uchun chop etilgan shartnoma namunasi topilmadi');

    const providerId = dto.providerUserId || (actor.registryStatus === PROVIDER_REGISTRY_STATUS[dto.type] ? actor.id : undefined);
    if (!providerId) throw new BadRequestException('Shartnoma uchun mediator, arbitr yoki hakamlik sudyasi tanlanishi kerak');
    const provider = await this.prisma.user.findFirst({
      where: { id: providerId, status: 'ACTIVE', registryStatus: PROVIDER_REGISTRY_STATUS[dto.type] },
      select: { id: true, fullName: true, pinfl: true },
    });
    if (!provider) throw new BadRequestException('Tanlangan xizmat ko‘rsatuvchi faol tegishli reyestr a’zosi emas');

    const participantInputs = dto.participants || [];
    if (!participantInputs.some((participant) => participant.role === ContractPartyRole.CLIENT)) {
      throw new BadRequestException('Kamida bitta mijoz taraf ko‘rsatilishi kerak');
    }
    if (new Set(participantInputs.map((participant) => participant.role)).size !== participantInputs.length) {
      throw new BadRequestException('Har bir taraf roli bir marta ko‘rsatilishi kerak');
    }
    if (participantInputs.some((participant) => participant.userId === provider.id || (provider.pinfl && participant.pinfl === provider.pinfl))) {
      throw new BadRequestException('Xizmat ko‘rsatuvchi mijoz taraf sifatida ham qo‘shilmasligi kerak');
    }
    const parties = await Promise.all(participantInputs.map((participant) => this.resolveParty(participant)));
    const actorIsParty = parties.some((party) => party.userId === actor.id);
    if (!actor.roles.includes('ADMIN') && provider.id !== actor.id && !actorIsParty) {
      throw new ForbiddenException('Shartnomani faqat uning tarafi yoki admin yaratishi mumkin');
    }

    const contractNumber = `SHA-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const snapshot = { id: template.id, type: template.type, name: template.name, version: template.version, content: template.content };
    const content = this.renderContractContent(dto, provider.fullName, snapshot.content, contractNumber);
    const contract = await this.prisma.serviceContract.create({
      data: {
        contractNumber,
        type: dto.type,
        title: dto.title.trim(),
        caseSummary: dto.caseSummary.trim(),
        rightsAndResponsibilities: dto.rightsAndResponsibilities.trim(),
        terms: dto.terms.trim(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        createdById: actor.id,
        providerId: provider.id,
        templateId: template.id,
        templateVersion: template.version,
        templateSnapshot: snapshot,
        renderedContent: content,
        participants: {
          create: [
            ...parties,
            { role: ContractPartyRole.PROVIDER, userId: provider.id, pinfl: provider.pinfl, fullName: provider.fullName },
          ],
        },
      },
      include: { participants: true },
    });
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'CREATE_SERVICE_CONTRACT', entityType: 'SERVICE_CONTRACT', entityId: contract.id, newValues: { contractNumber, type: dto.type, templateVersion: template.version }, ipAddress });
    return this.safeContract(contract);
  }

  async updateContract(actor: AuthUser, id: string, dto: UpdateContractDto, ipAddress?: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.createdById !== actor.id && contract.providerId !== actor.id && !actor.roles.includes('ADMIN')) {
      throw new ForbiddenException('Shartnomani faqat muallif, xizmat ko‘rsatuvchi yoki admin tahrirlaydi');
    }
    if (contract.status !== ServiceContractStatus.DRAFT && contract.status !== ServiceContractStatus.RETURNED_FOR_EDIT) {
      throw new ConflictException('Faqat qoralama yoki tahrirga qaytarilgan shartnoma tahrirlanadi');
    }
    const title = dto.title?.trim() ?? contract.title;
    const caseSummary = dto.caseSummary?.trim() ?? contract.caseSummary;
    const rightsAndResponsibilities = dto.rightsAndResponsibilities?.trim() ?? contract.rightsAndResponsibilities;
    const terms = dto.terms?.trim() ?? contract.terms;
    const template = contract.templateSnapshot as { content?: string } | null;
    const provider = await this.prisma.user.findUnique({ where: { id: contract.providerId }, select: { fullName: true } });
    const content = this.renderContractContent({ ...contract, title, caseSummary, rightsAndResponsibilities, terms }, provider?.fullName || '', template?.content || '', contract.contractNumber);
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.serviceContract.update({
        where: { id },
        data: {
          title,
          caseSummary,
          rightsAndResponsibilities,
          terms,
          ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
          renderedContent: content,
        },
      });
      if (contract.status === ServiceContractStatus.RETURNED_FOR_EDIT) {
        await tx.contractParticipant.updateMany({
          where: { contractId: id },
          data: { status: ContractPartyStatus.PENDING, pkcs7: null, signatureVerified: false, signerSerialNumber: null, signedAt: null, decisionNote: null },
        });
      }
      return saved;
    });
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'UPDATE_SERVICE_CONTRACT', entityType: 'SERVICE_CONTRACT', entityId: id, oldValues: { status: contract.status, title: contract.title }, newValues: { title, status: updated.status }, ipAddress });
    return this.getContract(actor, id);
  }

  async sendContract(actor: AuthUser, id: string, ipAddress?: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.providerId !== actor.id && !actor.roles.includes('ADMIN')) throw new ForbiddenException('Shartnomani faqat xizmat ko‘rsatuvchi yuboradi');
    if (contract.status !== ServiceContractStatus.DRAFT && contract.status !== ServiceContractStatus.RETURNED_FOR_EDIT) throw new ConflictException('Shartnoma yuborish uchun qoralama holatida bo‘lishi kerak');
    if (!contract.invoices.length) throw new ConflictException('Loyihani yuborishdan oldin invoys yarating');
    await this.prisma.$transaction(async (tx) => {
      if (contract.status === ServiceContractStatus.RETURNED_FOR_EDIT) {
        await tx.contractParticipant.updateMany({
          where: { contractId: id },
          data: { status: ContractPartyStatus.PENDING, pkcs7: null, signatureVerified: false, signerSerialNumber: null, signedAt: null, decisionNote: null },
        });
      }
      await tx.serviceContract.update({ where: { id }, data: { status: ServiceContractStatus.PENDING_PARTIES, sentAt: new Date() } });
    });
    await this.notifyParties(contract, `“${contract.contractNumber}” shartnomasi imzolash uchun yuborildi.`, `sha-${id}-sent-${Date.now()}`);
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'SEND_SERVICE_CONTRACT', entityType: 'SERVICE_CONTRACT', entityId: id, newValues: { status: ServiceContractStatus.PENDING_PARTIES }, ipAddress });
    return this.getContract(actor, id);
  }

  async signContract(actor: AuthUser, id: string, pkcs7: string, ipAddress?: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.status !== ServiceContractStatus.PENDING_PARTIES) throw new ConflictException('Shartnoma ayni paytda taraflar imzosi uchun ochiq emas');
    const party = contract.participants.find((candidate) => candidate.role !== ContractPartyRole.PROVIDER && this.matchesUser(candidate, actor));
    if (!party) throw new ForbiddenException('Siz shartnomaning imzolashi kutilayotgan tarafi emassiz');
    await this.verifySignature(contract, party, actor, pkcs7);
    await this.prisma.contractParticipant.update({ where: { id: party.id }, data: { status: ContractPartyStatus.SIGNED, pkcs7, signatureVerified: true, signedAt: new Date(), decisionNote: null } });
    const participants = await this.prisma.contractParticipant.findMany({ where: { contractId: id } });
    const allClientsSigned = participants.filter((candidate) => candidate.role !== ContractPartyRole.PROVIDER).every((candidate) => candidate.status === ContractPartyStatus.SIGNED);
    if (allClientsSigned) {
      await this.prisma.serviceContract.update({ where: { id }, data: { status: ServiceContractStatus.AWAITING_PROVIDER_APPROVAL } });
    }
    await this.notifyUser(
      contract.providerId,
      allClientsSigned
        ? `Barcha taraflar “${contract.contractNumber}” shartnomasini imzoladi. Yakuniy tasdiq kutilmoqda.`
        : `${party.fullName} “${contract.contractNumber}” shartnomasini imzoladi.`,
      `sha-${id}-party-signed-${party.id}`,
    );
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'SIGN_SERVICE_CONTRACT', entityType: 'SERVICE_CONTRACT', entityId: id, newValues: { participantRole: party.role, signedAt: new Date().toISOString(), verified: true }, ipAddress });
    return this.getContract(actor, id);
  }

  async approveContract(actor: AuthUser, id: string, pkcs7: string, ipAddress?: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.providerId !== actor.id) throw new ForbiddenException('Yakuniy tasdiqni faqat biriktirilgan mediator, arbitr yoki hakamlik sudyasi beradi');
    if (contract.status !== ServiceContractStatus.AWAITING_PROVIDER_APPROVAL) throw new ConflictException('Yakuniy tasdiqdan oldin barcha taraflar imzolashi kerak');
    const providerParty = contract.participants.find((candidate) => candidate.role === ContractPartyRole.PROVIDER);
    if (!providerParty) throw new ConflictException('Xizmat ko‘rsatuvchi taraf ma’lumoti topilmadi');
    await this.verifySignature(contract, providerParty, actor, pkcs7);
    const signedAt = new Date();
    const participants = contract.participants
      .map((party) => party.id === providerParty.id
        ? { ...party, status: ContractPartyStatus.SIGNED, pkcs7, signatureVerified: true, signedAt }
        : party)
      .sort((a, b) => a.role.localeCompare(b.role));
    const pdf = await this.createPdf(this.contractPdfLines(contract, participants, signedAt));
    const signedPdfSha256 = createHash('sha256').update(pdf).digest('hex');
    await this.prisma.$transaction([
      this.prisma.contractParticipant.update({ where: { id: providerParty.id }, data: { status: ContractPartyStatus.SIGNED, pkcs7, signatureVerified: true, signedAt } }),
      this.prisma.serviceContract.update({ where: { id }, data: { status: ServiceContractStatus.SIGNED, signedAt, signedPdf: pdf, signedPdfSha256 } }),
    ]);
    await this.notifyParties(contract, `“${contract.contractNumber}” shartnomasi barcha taraflar tomonidan imzolandi.`, `sha-${id}-signed`);
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'APPROVE_SERVICE_CONTRACT', entityType: 'SERVICE_CONTRACT', entityId: id, newValues: { status: ServiceContractStatus.SIGNED, signedAt: signedAt.toISOString(), signedPdfSha256 }, ipAddress });
    return this.getContract(actor, id);
  }

  async rejectContract(actor: AuthUser, id: string, dto: ContractDecisionDto, ipAddress?: string) {
    return this.decideContract(actor, id, ContractPartyStatus.REJECTED, ServiceContractStatus.REJECTED, dto.reason, ipAddress);
  }

  async returnForEdit(actor: AuthUser, id: string, dto: ContractDecisionDto, ipAddress?: string) {
    return this.decideContract(actor, id, ContractPartyStatus.RETURNED, ServiceContractStatus.RETURNED_FOR_EDIT, dto.reason, ipAddress);
  }

  async getSignatures(actor: AuthUser, id: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    return contract.participants.map(({ id: participantId, role, fullName, status, signatureVerified, signerSerialNumber, signedAt, decisionNote, pinfl }) => ({
      id: participantId, role, fullName, pinfl, status, signatureVerified, signerSerialNumber, signedAt, decisionNote,
    }));
  }

  async getContractPdf(actor: AuthUser, id: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.status === ServiceContractStatus.SIGNED && contract.signedPdf) {
      const actualHash = createHash('sha256').update(contract.signedPdf).digest('hex');
      if (!contract.signedPdfSha256 || actualHash !== contract.signedPdfSha256) {
        throw new InternalServerErrorException('Imzolangan shartnoma fayli yaxlitlik tekshiruvidan o‘tmadi');
      }
      return contract.signedPdf;
    }
    return this.createPdf(this.contractPdfLines(contract, contract.participants));
  }

  async listPublicTemplates(type?: ContractType) {
    if (type && !Object.values(ContractType).includes(type)) {
      throw new BadRequestException('Shartnoma turi noto‘g‘ri ko‘rsatilgan');
    }
    return this.prisma.contractTemplate.findMany({
      where: { status: ContractTemplateStatus.PUBLISHED, ...(type ? { type } : {}) },
      select: { id: true, type: true, name: true, version: true, publishedAt: true },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
  }

  async listTemplates() {
    return this.prisma.contractTemplate.findMany({ orderBy: [{ type: 'asc' }, { version: 'desc' }] });
  }

  async createTemplate(actor: AuthUser, dto: CreateContractTemplateDto, ipAddress?: string) {
    const latest = await this.prisma.contractTemplate.findFirst({ where: { type: dto.type }, orderBy: { version: 'desc' }, select: { version: true } });
    const template = await this.prisma.contractTemplate.create({
      data: { type: dto.type, name: dto.name.trim(), content: dto.content.trim(), version: (latest?.version || 0) + 1, createdById: actor.id },
    });
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'CREATE_CONTRACT_TEMPLATE', entityType: 'CONTRACT_TEMPLATE', entityId: template.id, newValues: { type: dto.type, version: template.version }, ipAddress });
    return template;
  }

  async updateTemplate(actor: AuthUser, id: string, dto: UpdateContractTemplateDto, ipAddress?: string) {
    const current = await this.prisma.contractTemplate.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Shartnoma namunasi topilmadi');
    if (current.status !== ContractTemplateStatus.DRAFT && (dto.name !== undefined || dto.content !== undefined)) {
      throw new ConflictException('Nashr qilingan namuna tahrirlanmaydi; yangi versiya yarating');
    }
    if (current.status === ContractTemplateStatus.ARCHIVED) throw new ConflictException('Arxivlangan namuna o‘zgartirilmaydi');
    if (dto.status === ContractTemplateStatus.DRAFT && current.status !== ContractTemplateStatus.DRAFT) throw new ConflictException('Nashr qilingan namunani qoralamaga qaytarib bo‘lmaydi');
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.status === ContractTemplateStatus.PUBLISHED) {
        await tx.contractTemplate.updateMany({ where: { type: current.type, status: ContractTemplateStatus.PUBLISHED, id: { not: id } }, data: { status: ContractTemplateStatus.ARCHIVED } });
      }
      return tx.contractTemplate.update({
        where: { id },
        data: {
          updatedById: actor.id,
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
          ...(dto.status !== undefined ? { status: dto.status, publishedAt: dto.status === ContractTemplateStatus.PUBLISHED ? new Date() : current.publishedAt } : {}),
        },
      });
    });
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'UPDATE_CONTRACT_TEMPLATE', entityType: 'CONTRACT_TEMPLATE', entityId: id, oldValues: { status: current.status, version: current.version }, newValues: { status: updated.status, version: updated.version }, ipAddress });
    return updated;
  }

  async getBankDetails(actor: AuthUser) {
    return this.prisma.mediatorBankDetails.findUnique({ where: { userId: actor.id } });
  }

  async updateBankDetails(actor: AuthUser, dto: MediatorBankDetailsDto, ipAddress?: string) {
    this.assertProviderRole(actor);
    const bankDetails = await this.prisma.mediatorBankDetails.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...dto },
      update: dto,
    });
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'UPDATE_MEDIATOR_BANK_DETAILS', entityType: 'MEDIATOR_BANK_DETAILS', entityId: bankDetails.id, newValues: { bankName: bankDetails.bankName, bankCode: bankDetails.bankCode, accountNumberLast4: bankDetails.accountNumber.slice(-4) }, ipAddress });
    return bankDetails;
  }

  async createInvoice(actor: AuthUser, contractId: string, dto: CreateInvoiceDto, ipAddress?: string) {
    const contract = await this.getContractRecord(contractId);
    this.assertAccess(contract, actor);
    if (contract.providerId !== actor.id) throw new ForbiddenException('Invoysni faqat xizmat ko‘rsatuvchi yuboradi');
    if (contract.status !== ServiceContractStatus.DRAFT && contract.status !== ServiceContractStatus.RETURNED_FOR_EDIT) throw new ConflictException('Invoys faqat shartnoma loyihasiga yuboriladi');
    const bank = await this.prisma.mediatorBankDetails.findUnique({ where: { userId: actor.id } });
    if (!bank) throw new ConflictException('Avval kabinetda bank hisob raqamingizni saqlang');
    const client = contract.participants.find((participant) => participant.role === ContractPartyRole.CLIENT && participant.userId);
    if (!client?.userId) throw new ConflictException('Invoys uchun tizimdagi mijoz kabineti bog‘langan bo‘lishi kerak');
    const result = await this.billing.createInvoice({ userId: client.userId, amount: dto.amount, serviceType: `SERVICE_CONTRACT_${contract.type}`, payerPinfl: client.pinfl || undefined, payerName: client.fullName });
    const billingTransaction = await this.prisma.billingTransaction.findUnique({ where: { invoiceNumber: result.invoiceNumber } });
    if (!billingTransaction) throw new ConflictException('Billing tranzaksiyasi yaratilmadi');
    await this.prisma.billingTransaction.update({ where: { id: billingTransaction.id }, data: { metadata: { contractId, contractNumber: contract.contractNumber, qrCodeUrl: result.qrCodeUrl, bankDetails: { accountHolder: bank.accountHolder, accountNumber: bank.accountNumber, bankName: bank.bankName, bankCode: bank.bankCode, taxId: bank.taxId } } } });
    const invoice = await this.prisma.serviceInvoice.create({
      data: { serviceContractId: contractId, billingTransactionId: billingTransaction.id, invoiceNumber: result.invoiceNumber, payerId: client.userId, issuerId: actor.id, amount: billingTransaction.amount },
      include: { billingTransaction: { select: { paymentStatus: true } } },
    });
    await this.notifyUser(client.userId, `“${contract.contractNumber}” shartnomasi bo‘yicha invoys yuborildi.`, `sha-invoice-${invoice.id}-sent`);
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: 'CREATE_SERVICE_INVOICE', entityType: 'SERVICE_INVOICE', entityId: invoice.id, newValues: { invoiceNumber: invoice.invoiceNumber, amount: invoice.amount.toString(), contractId }, ipAddress });
    return { ...invoice, qrCodeUrl: result.qrCodeUrl };
  }

  async getInvoice(actor: AuthUser, id: string) {
    const invoice = await this.prisma.serviceInvoice.findUnique({
      where: { id },
      include: {
        billingTransaction: { select: { paymentStatus: true, paidAt: true, paymentProvider: true, transactionId: true, metadata: true } },
        serviceContract: { select: { id: true, contractNumber: true, title: true, providerId: true } },
        payer: { select: { id: true, fullName: true, pinfl: true } },
        issuer: { select: { id: true, fullName: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoys topilmadi');
    if (![invoice.payerId, invoice.issuerId].includes(actor.id) && !actor.roles.includes('ADMIN')) throw new ForbiddenException('Ushbu invoysga kirish huquqi yo‘q');
    return invoice;
  }

  async getReceiptPdf(actor: AuthUser, id: string) {
    const invoice = await this.getInvoice(actor, id);
    if (invoice.billingTransaction.paymentStatus !== PaymentStatus.PAID) throw new ConflictException('Kvitansiya faqat to‘lov tasdiqlangandan keyin yaratiladi');
    const metadata = invoice.billingTransaction.metadata as Record<string, any> | null;
    const bank = metadata?.bankDetails || {};
    return this.createPdf([
      'TO‘LOV KVITANSIYASI',
      `Invoys: ${invoice.invoiceNumber}`,
      `Shartnoma: ${invoice.serviceContract.contractNumber}`,
      `To‘lovchi: ${invoice.payer.fullName}`,
      `Xizmat ko‘rsatuvchi: ${invoice.issuer.fullName}`,
      `Summa: ${invoice.amount.toString()} ${invoice.currency}`,
      `To‘lov holati: ${invoice.billingTransaction.paymentStatus}`,
      `To‘lov sanasi: ${invoice.billingTransaction.paidAt?.toISOString() || '—'}`,
      `Bank: ${bank.bankName || '—'}`,
      `Hisob raqami: ${bank.accountNumber || '—'}`,
      `MFO: ${bank.bankCode || '—'}`,
      `To‘lov provayderi: ${invoice.billingTransaction.paymentProvider || '—'}`,
      `Tranzaksiya: ${invoice.billingTransaction.transactionId || '—'}`,
    ]);
  }

  private async decideContract(actor: AuthUser, id: string, partyStatus: ContractPartyStatus, contractStatus: ServiceContractStatus, reason?: string, ipAddress?: string) {
    const contract = await this.getContractRecord(id);
    this.assertAccess(contract, actor);
    if (contract.status !== ServiceContractStatus.PENDING_PARTIES) throw new ConflictException('Shartnoma qaror qabul qilish uchun kutilayotgan holatda emas');
    const party = contract.participants.find((candidate) => candidate.role !== ContractPartyRole.PROVIDER && this.matchesUser(candidate, actor));
    if (!party) throw new ForbiddenException('Siz shartnomaning qaror kiritishi kutilayotgan tarafi emassiz');
    await this.prisma.$transaction([
      this.prisma.contractParticipant.update({ where: { id: party.id }, data: { status: partyStatus, decisionNote: reason?.trim() || null } }),
      this.prisma.serviceContract.update({ where: { id }, data: { status: contractStatus } }),
    ]);
    await this.notifyUser(contract.providerId, `“${contract.contractNumber}” shartnomasi ${partyStatus === ContractPartyStatus.REJECTED ? 'rad etildi' : 'tahrirga qaytarildi'}.${reason ? ` Sabab: ${reason}` : ''}`, `sha-${id}-${partyStatus.toLowerCase()}-${party.id}-${Date.now()}`);
    await this.audit.log({ userId: actor.id, username: actor.username, userFullName: actor.fullName, action: partyStatus === ContractPartyStatus.REJECTED ? 'REJECT_SERVICE_CONTRACT' : 'RETURN_SERVICE_CONTRACT_FOR_EDIT', entityType: 'SERVICE_CONTRACT', entityId: id, newValues: { status: contractStatus, reason }, ipAddress });
    return this.getContract(actor, id);
  }

  private async verifySignature(contract: any, party: any, actor: AuthUser, pkcs7: string) {
    if (party.status !== ContractPartyStatus.PENDING) throw new ConflictException('Ushbu taraf allaqachon qaror bergan');
    const expectedPinfl = party.pinfl || actor.pinfl;
    if (!expectedPinfl) throw new BadRequestException('E-imzo tekshiruvi uchun tarafning PINFL ma’lumoti kerak');
    const documentHash = createHash('sha256').update(this.contractSignaturePayload(contract)).digest('hex');
    const verification = await this.esign.verifyPkcs7(pkcs7, documentHash);
    if (!verification.valid) throw new BadRequestException('E-imzo haqiqiy emas');
    if (verification.pinfl !== expectedPinfl) throw new ForbiddenException('E-imzo PINFL shartnomadagi taraf bilan mos kelmadi');
  }

  private contractSignaturePayload(contract: any) {
    return [contract.contractNumber, contract.type, contract.title, contract.caseSummary, contract.rightsAndResponsibilities, contract.terms, contract.validUntil?.toISOString() || '', contract.renderedContent || ''].join('\n');
  }

  private async resolveParty(input: ContractPartyInputDto) {
    const user = input.userId
      ? await this.prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, fullName: true, pinfl: true, status: true } })
      : input.pinfl
        ? await this.prisma.user.findUnique({ where: { pinfl: input.pinfl }, select: { id: true, fullName: true, pinfl: true, status: true } })
        : null;
    if (input.userId && !user) throw new BadRequestException('Shartnoma tarafi uchun foydalanuvchi topilmadi');
    if (user && user.status !== 'ACTIVE') throw new BadRequestException('Shartnoma tarafi hisob qaydnomasi faol emas');
    if (user && input.pinfl && user.pinfl !== input.pinfl) throw new BadRequestException('Taraf PINFLi foydalanuvchi bilan mos kelmadi');
    if (!user && (!input.pinfl || !input.fullName?.trim())) throw new BadRequestException('Tizimda akkaunti yo‘q taraf uchun PINFL va F.I.Sh. kiriting');
    const pinfl = user?.pinfl || input.pinfl;
    if (!pinfl || !/^\d{14}$/.test(pinfl)) throw new BadRequestException('Taraf PINFLi 14 ta raqamdan iborat bo‘lishi kerak');
    return { role: input.role, userId: user?.id || null, pinfl, fullName: user?.fullName || input.fullName!.trim() };
  }

  private async getContractRecord(id: string) {
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id },
      include: {
        participants: true,
        invoices: { include: { billingTransaction: { select: { paymentStatus: true, paidAt: true } } }, orderBy: { sentAt: 'desc' } },
        provider: { select: { id: true, fullName: true, pinfl: true } },
        template: { select: { id: true, type: true, name: true, version: true, status: true } },
      },
    });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');
    return contract;
  }

  private assertAccess(contract: { createdById: string; providerId: string; participants: { userId: string | null; pinfl: string | null }[] }, actor: AuthUser) {
    if (actor.roles.includes('ADMIN') || contract.createdById === actor.id || contract.providerId === actor.id || contract.participants.some((party) => this.matchesUser(party, actor))) return;
    throw new ForbiddenException('Shartnomaga kirish huquqi yo‘q');
  }

  private matchesUser(party: { userId: string | null; pinfl: string | null }, actor: AuthUser) {
    return party.userId === actor.id || (!!actor.pinfl && party.pinfl === actor.pinfl);
  }

  private accessWhere(actor: AuthUser) {
    if (actor.roles.includes('ADMIN')) return {};
    return {
      OR: [
        { createdById: actor.id },
        { providerId: actor.id },
        { participants: { some: { OR: [{ userId: actor.id }, ...(actor.pinfl ? [{ pinfl: actor.pinfl }] : [])] } } },
      ],
    };
  }

  private safeContract(contract: any) {
    const { signedPdf: _signedPdf, ...visible } = contract;
    return {
      ...visible,
      participants: visible.participants?.map(({ pkcs7: _pkcs7, ...party }: any) => party),
    };
  }

  private assertProviderRole(actor: AuthUser) {
    if (!actor.roles.some((role) => ['MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR'].includes(role))) {
      throw new ForbiddenException('Faqat mediator, hakamlik sudyasi yoki arbitr bank ma’lumotlarini boshqaradi');
    }
  }

  private renderContractContent(contract: any, providerName: string, template: string, contractNumber: string) {
    const values: Record<string, string> = {
      contractNumber,
      title: contract.title,
      caseSummary: contract.caseSummary,
      rightsAndResponsibilities: contract.rightsAndResponsibilities,
      terms: contract.terms,
      providerName,
    };
    const rendered = template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_match, key: string) => values[key] || '');
    return [rendered, `Shartnoma: ${contractNumber}`, `Nomi: ${contract.title}`, `Ish mazmuni:\n${contract.caseSummary}`, `Huquq va majburiyatlar:\n${contract.rightsAndResponsibilities}`, `Shartlar:\n${contract.terms}`, `Xizmat ko‘rsatuvchi: ${providerName}`].join('\n\n');
  }

  private contractPdfLines(contract: any, participants: any[], signedAt?: Date) {
    const lines = [
      contract.title,
      `Shartnoma raqami: ${contract.contractNumber}`,
      `Turi: ${contract.type}`,
      `Holati: ${signedAt ? ServiceContractStatus.SIGNED : contract.status}`,
      `Amal qilish muddati: ${contract.validUntil?.toISOString() || 'Ko‘rsatilmagan'}`,
      '',
      contract.renderedContent || this.renderContractContent(contract, contract.provider?.fullName || '', '', contract.contractNumber),
      '',
      'TARAFLAR VA IMZOLAR',
      ...participants.map((party) => `${party.role}: ${party.fullName}; PINFL: ${party.pinfl || '—'}; holati: ${party.status}; imzo vaqti: ${party.signedAt?.toISOString() || (party.role === ContractPartyRole.PROVIDER && signedAt ? signedAt.toISOString() : 'kutilmoqda')}; tekshirildi: ${party.signatureVerified ? 'ha' : 'yo‘q'}`),
      ...(signedAt ? ['', `Yakuniy imzolangan vaqt: ${signedAt.toISOString()}`] : []),
    ];
    return lines;
  }

  private createPdf(lines: string[]) {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 48, right: 48, bottom: 48, left: 48 }, info: { Title: lines[0] || 'Shartnoma' } });
      const chunks: Buffer[] = [];
      const font = path.join(process.cwd(), 'node_modules', '@fontsource', 'noto-sans', 'files', 'noto-sans-latin-ext-400-normal.woff2');
      doc.font(font);
      doc.fontSize(16).text(lines[0] || 'Hujjat', { align: 'center' }).moveDown(0.8);
      doc.fontSize(10);
      for (const line of lines.slice(1)) {
        if (!line) {
          doc.moveDown(0.5);
          continue;
        }
        doc.text(line, { width: 500, lineGap: 3 });
        doc.moveDown(0.25);
      }
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  private async notifyParties(contract: { id: string; contractNumber: string; participants: { userId: string | null }[] }, content: string, key: string) {
    const ids = [...new Set(contract.participants.map((party) => party.userId).filter((id): id is string => Boolean(id)))];
    for (const userId of ids) await this.notifyUser(userId, content, `${key}-${userId}`);
  }

  private async notifyUser(userId: string, content: string, key: string) {
    try {
      await this.notifications.send({ userId, templateCode: 'CONTRACT_STATUS', variables: { title: 'Shartnoma holati', content }, idempotencyKey: key, channels: ['CABINET', 'SMS'] as any });
    } catch (error) {
      this.logger.warn(`Shartnoma bildirishnomasini yuborib bo‘lmadi: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
