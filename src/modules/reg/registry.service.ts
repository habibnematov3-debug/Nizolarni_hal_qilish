import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  CabinetType,
  MediatorRegistryStatus,
  Prisma,
  RegistryEntryStatus,
  RegistryType,
  RegistryStatus,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { MyGovIntegrationAdapter } from '../integration/adapters/mygov.adapter';
import { CreateRegistryEntryDto, UpdateRegistryEntryDto } from './dto/registry-entry.dto';
import { PublicRegistryQueryDto, RegistryQueryDto } from './dto/registry-query.dto';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationChannel } from '@prisma/client';

const IMPORT_HEADERS = [
  'registryNumber', 'pinfl', 'type', 'fullName', 'phone', 'email', 'region', 'address',
  'gender', 'birthDate', 'education', 'specialization', 'languages', 'photoUrl',
  'latitude', 'longitude', 'certificateNumber', 'certificateIssuedAt',
  'certificateExpiresAt', 'registeredAt', 'isSample',
];

@Injectable()
export class RegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RegistryService.name);
  private syncInterval?: NodeJS.Timeout;
  private syncStartupTimeout?: NodeJS.Timeout;
  private readonly syncInProgress = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly myGov: MyGovIntegrationAdapter,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.VERCEL) return;
    this.syncStartupTimeout = setTimeout(() => void this.runMyGovSyncQueue(), 30_000);
    this.syncStartupTimeout.unref?.();
    this.syncInterval = setInterval(() => void this.runMyGovSyncQueue(), 60_000);
    this.syncInterval.unref?.();
  }

  onModuleDestroy() {
    if (this.syncStartupTimeout) clearTimeout(this.syncStartupTimeout);
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  async listPublic(query: PublicRegistryQueryDto) {
    const where: Prisma.RegistryEntryWhereInput = {
      status: RegistryEntryStatus.ACTIVE,
      publicProfile: true,
      deletedAt: null,
      AND: [{ OR: [{ certificateExpiresAt: null }, { certificateExpiresAt: { gte: new Date() } }] }],
      type: query.type || RegistryType.MEDIATOR,
      ...(query.region ? { region: { contains: query.region, mode: 'insensitive' } } : {}),
      ...(query.specialization ? { specialization: { has: query.specialization } } : {}),
      ...(query.language ? { languages: { has: query.language } } : {}),
      ...(query.minimumRating !== undefined ? { ratings: { some: { score: { gte: query.minimumRating } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { region: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { page = 1, limit = 20 } = query;
    const [total, entries] = await Promise.all([
      this.prisma.registryEntry.count({ where }),
      this.prisma.registryEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { ratings: { orderBy: [{ periodYear: 'desc' }, { calculatedAt: 'desc' }], take: 1 } },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return {
      items: entries.map((entry) => this.publicProjection(entry)),
      pagination: this.pagination(total, page, limit),
    };
  }

  async getPublicProfile(id: string) {
    const entry = await this.prisma.registryEntry.findFirst({
      where: {
        id,
        status: RegistryEntryStatus.ACTIVE,
        publicProfile: true,
        deletedAt: null,
        AND: [{ OR: [{ certificateExpiresAt: null }, { certificateExpiresAt: { gte: new Date() } }] }],
      },
      include: { ratings: { orderBy: [{ periodYear: 'desc' }, { calculatedAt: 'desc' }], take: 1 } },
    });
    if (!entry) throw new NotFoundException('Ochiq reyestr yozuvi topilmadi');
    return this.publicProjection(entry);
  }

  async getMapPoints(query: PublicRegistryQueryDto) {
    const entries = await this.prisma.registryEntry.findMany({
      where: {
        type: query.type || RegistryType.MEDIATOR,
        status: RegistryEntryStatus.ACTIVE,
        publicProfile: true,
        deletedAt: null,
        AND: [{ OR: [{ certificateExpiresAt: null }, { certificateExpiresAt: { gte: new Date() } }] }],
        latitude: { not: null },
        longitude: { not: null },
        ...(query.region ? { region: { contains: query.region, mode: 'insensitive' } } : {}),
        ...(query.specialization ? { specialization: { has: query.specialization } } : {}),
        ...(query.language ? { languages: { has: query.language } } : {}),
        ...(query.minimumRating !== undefined ? { ratings: { some: { score: { gte: query.minimumRating } } } } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { region: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        type: true,
        region: true,
        specialization: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { fullName: 'asc' },
    });
    return entries.map((entry) => ({ ...entry, profileUrl: `/public/mediators/${entry.id}` }));
  }

  async listStaff(query: RegistryQueryDto, actor: AuthUser) {
    const where = this.staffWhere(query, actor);
    const { page = 1, limit = 20 } = query;
    const [total, entries] = await Promise.all([
      this.prisma.registryEntry.count({ where }),
      this.prisma.registryEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, username: true, cabinetType: true } } },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return { items: entries, pagination: this.pagination(total, page, limit) };
  }

  async getStaffEntry(id: string, actor: AuthUser) {
    const entry = await this.getEntry(id);
    this.assertRegionAccess(entry.region, actor);
    return this.prisma.registryEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            pinfl: true,
            phone: true,
            email: true,
            address: true,
            gender: true,
            birthDate: true,
            cabinetType: true,
            registryStatus: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createEntry(dto: CreateRegistryEntryDto, actor: AuthUser, ipAddress?: string) {
    this.assertRegionAccess(dto.region, actor);
    const linkedUser = await this.resolveUser(dto.userId, dto.pinfl);
    const pinfl = dto.pinfl || linkedUser?.pinfl || null;
    await this.assertNotDuplicate(dto.type, dto.registryNumber, pinfl, linkedUser?.id);

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.registryEntry.create({
        data: {
          userId: linkedUser?.id,
          registryNumber: this.clean(dto.registryNumber),
          pinfl,
          type: dto.type,
          fullName: dto.fullName.trim(),
          phone: this.clean(dto.phone) || linkedUser?.phone,
          email: this.clean(dto.email) || linkedUser?.email,
          address: this.clean(dto.address) || linkedUser?.address,
          region: dto.region.trim(),
          gender: this.clean(dto.gender) || linkedUser?.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : this.parseBirthDate(linkedUser?.birthDate),
          photoUrl: this.safePhotoUrl(dto.photoUrl),
          education: this.clean(dto.education),
          specialization: this.cleanList(dto.specialization),
          languages: this.cleanList(dto.languages),
          latitude: dto.latitude,
          longitude: dto.longitude,
          certificateNumber: this.clean(dto.certificateNumber),
          certificateIssuedAt: dto.certificateIssuedAt ? new Date(dto.certificateIssuedAt) : null,
          certificateExpiresAt: dto.certificateExpiresAt ? new Date(dto.certificateExpiresAt) : null,
          isSample: dto.isSample ?? false,
          publicProfile: dto.publicProfile ?? true,
          createdById: actor.id,
          status: RegistryEntryStatus.ACTIVE,
        },
      });
      await tx.registryStatusHistory.create({
        data: {
          registryEntryId: entry.id,
          previousStatus: null,
          status: entry.status,
          reason: 'Reyestrga kiritildi',
          changedById: actor.id,
        },
      });
      if (linkedUser) await this.syncLinkedUser(tx, entry, linkedUser.id);
      return entry;
    });

    await this.audit.log({
      userId: actor.id,
      username: actor.username,
      userFullName: actor.fullName,
      action: 'CREATE_REGISTRY_ENTRY',
      entityType: 'REGISTRY_ENTRY',
      entityId: created.id,
      newValues: this.auditSnapshot(created),
      ipAddress,
    });
    if (!created.isSample) await this.enqueueMyGovSync(created.id, 'UPSERT');
    return created;
  }

  async updateEntry(id: string, dto: UpdateRegistryEntryDto, actor: AuthUser, ipAddress?: string) {
    const old = await this.getEntry(id);
    this.assertRegionAccess(old.region, actor);
    if (dto.region) this.assertRegionAccess(dto.region, actor);
    const linkedUser = dto.userId || dto.pinfl
      ? await this.resolveUser(dto.userId, dto.pinfl)
      : old.userId
        ? await this.prisma.user.findUnique({ where: { id: old.userId } })
        : null;
    const pinfl = dto.pinfl ?? linkedUser?.pinfl ?? old.pinfl;
    await this.assertNotDuplicate(dto.type || old.type, dto.registryNumber, pinfl, linkedUser?.id, id);

    const updated = await this.prisma.registryEntry.update({
      where: { id },
      data: {
        ...(dto.userId !== undefined || dto.pinfl !== undefined ? { userId: linkedUser?.id || null } : {}),
        ...(dto.registryNumber !== undefined ? { registryNumber: this.clean(dto.registryNumber) } : {}),
        ...(dto.pinfl !== undefined || dto.userId !== undefined ? { pinfl } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: this.clean(dto.phone) } : {}),
        ...(dto.email !== undefined ? { email: this.clean(dto.email) } : {}),
        ...(dto.address !== undefined ? { address: this.clean(dto.address) } : {}),
        ...(dto.region !== undefined ? { region: dto.region.trim() } : {}),
        ...(dto.gender !== undefined ? { gender: this.clean(dto.gender) } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: this.safePhotoUrl(dto.photoUrl) } : {}),
        ...(dto.education !== undefined ? { education: this.clean(dto.education) } : {}),
        ...(dto.specialization !== undefined ? { specialization: this.cleanList(dto.specialization) } : {}),
        ...(dto.languages !== undefined ? { languages: this.cleanList(dto.languages) } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.certificateNumber !== undefined ? { certificateNumber: this.clean(dto.certificateNumber) } : {}),
        ...(dto.certificateIssuedAt !== undefined ? { certificateIssuedAt: dto.certificateIssuedAt ? new Date(dto.certificateIssuedAt) : null } : {}),
        ...(dto.certificateExpiresAt !== undefined ? { certificateExpiresAt: dto.certificateExpiresAt ? new Date(dto.certificateExpiresAt) : null } : {}),
        ...(dto.isSample !== undefined ? { isSample: dto.isSample } : {}),
        ...(dto.publicProfile !== undefined ? { publicProfile: dto.publicProfile } : {}),
        updatedById: actor.id,
      },
    });
    if (linkedUser) {
      await this.prisma.$transaction((tx) => this.syncLinkedUser(tx, updated, linkedUser.id));
    }
    await this.audit.log({
      userId: actor.id,
      username: actor.username,
      userFullName: actor.fullName,
      action: 'UPDATE_REGISTRY_ENTRY',
      entityType: 'REGISTRY_ENTRY',
      entityId: updated.id,
      oldValues: this.auditSnapshot(old),
      newValues: this.auditSnapshot(updated),
      ipAddress,
    });
    if (old.isSample && !updated.isSample) await this.enqueueMyGovSync(updated.id, 'UPSERT');
    else if (!old.isSample && updated.isSample) await this.enqueueMyGovSync(updated.id, 'DELETE');
    else if (!updated.isSample) await this.enqueueMyGovSync(updated.id, 'UPSERT');
    return updated;
  }

  async changeStatus(
    id: string,
    status: RegistryEntryStatus,
    reason: string | undefined,
    actor: AuthUser,
    ipAddress?: string,
  ) {
    const old = await this.getEntry(id);
    this.assertRegionAccess(old.region, actor);
    if (old.status === status) return old;

    const updated = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.registryEntry.update({
        where: { id },
        data: { status, updatedById: actor.id },
      });
      await tx.registryStatusHistory.create({
        data: {
          registryEntryId: id,
          previousStatus: old.status,
          status,
          reason: this.clean(reason),
          changedById: actor.id,
        },
      });
      if (entry.userId) await this.syncLinkedUser(tx, entry, entry.userId);
      return entry;
    });
    await this.audit.log({
      userId: actor.id,
      username: actor.username,
      userFullName: actor.fullName,
      action: 'CHANGE_REGISTRY_STATUS',
      entityType: 'REGISTRY_ENTRY',
      entityId: id,
      oldValues: { status: old.status },
      newValues: { status, reason },
      ipAddress,
    });
    await this.enqueueMyGovSync(id, 'STATUS_CHANGE');
    return updated;
  }

  async deleteEntry(id: string, actor: AuthUser, ipAddress?: string) {
    const old = await this.getEntry(id);
    this.assertRegionAccess(old.region, actor);
    const deleted = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.registryEntry.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: RegistryEntryStatus.REVOKED,
          updatedById: actor.id,
        },
      });
      if (old.status !== RegistryEntryStatus.REVOKED) {
        await tx.registryStatusHistory.create({
          data: {
            registryEntryId: id,
            previousStatus: old.status,
            status: RegistryEntryStatus.REVOKED,
            reason: 'Yozuv reyestrdan o\'chirildi',
            changedById: actor.id,
          },
        });
      }
      if (entry.userId) await this.syncLinkedUser(tx, entry, entry.userId);
      return entry;
    });
    await this.audit.log({
      userId: actor.id,
      username: actor.username,
      userFullName: actor.fullName,
      action: 'DELETE_REGISTRY_ENTRY',
      entityType: 'REGISTRY_ENTRY',
      entityId: id,
      oldValues: this.auditSnapshot(old),
      newValues: { deletedAt: deleted.deletedAt, status: deleted.status },
      ipAddress,
    });
    if (!old.isSample) await this.enqueueMyGovSync(id, 'DELETE');
    return { success: true, id, deletedAt: deleted.deletedAt };
  }

  async getStatusHistory(id: string, actor: AuthUser) {
    const entry = await this.getEntry(id);
    this.assertRegionAccess(entry.region, actor);
    return this.prisma.registryStatusHistory.findMany({
      where: { registryEntryId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStatistics(query: RegistryQueryDto, actor: AuthUser) {
    const where = this.staffWhere({ ...query, page: 1, limit: 1 }, actor);
    const [total, active, suspended, revoked, male, female, byType] = await Promise.all([
      this.prisma.registryEntry.count({ where }),
      this.prisma.registryEntry.count({ where: { ...where, status: RegistryEntryStatus.ACTIVE } }),
      this.prisma.registryEntry.count({ where: { ...where, status: RegistryEntryStatus.SUSPENDED } }),
      this.prisma.registryEntry.count({ where: { ...where, status: RegistryEntryStatus.REVOKED } }),
      this.prisma.registryEntry.count({ where: { ...where, gender: { in: ['MALE', 'ERKAK'] } } }),
      this.prisma.registryEntry.count({ where: { ...where, gender: { in: ['FEMALE', 'AYOL'] } } }),
      this.prisma.registryEntry.groupBy({ by: ['type'], where, _count: { _all: true } }),
    ]);
    return {
      total,
      active,
      male,
      female,
      suspended,
      revoked,
      byType: Object.fromEntries(byType.map((row) => [row.type, row._count._all])),
    };
  }

  async exportExcel(query: RegistryQueryDto, actor: AuthUser) {
    const entries = await this.prisma.registryEntry.findMany({
      where: this.staffWhere(query, actor),
      orderBy: [{ region: 'asc' }, { fullName: 'asc' }],
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reyestr');
    sheet.columns = IMPORT_HEADERS.map((header) => ({ header, key: header, width: 22 }));
    for (const entry of entries) sheet.addRow(this.exportRow(entry));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async importExcel(file: Express.Multer.File, actor: AuthUser, ipAddress?: string) {
    if (!file || !file.buffer) throw new BadRequestException('Excel fayl yuklanmagan');
    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Faqat .xlsx formatidagi Excel fayl qabul qilinadi');
    }
    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    } catch {
      throw new BadRequestException('Excel faylini o\'qib bo\'lmadi');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) throw new BadRequestException('Excel faylida import qatorlari yo\'q');
    if (sheet.rowCount > 5001) throw new BadRequestException('Bitta importda 5000 tadan ortiq qator yuborib bo\'lmaydi');

    let headerRowNumber = 1;
    let headers = sheet.getRow(headerRowNumber).values as ExcelJS.CellValue[];
    const headerSearchLimit = Math.min(5, sheet.rowCount);
    for (let rowNumber = 1; rowNumber <= headerSearchLimit; rowNumber++) {
      const candidate = sheet.getRow(rowNumber).values as ExcelJS.CellValue[];
      const cells = candidate.slice(1).map((value) => String(value ?? '').trim().toLocaleLowerCase());
      if (cells.includes('fullname') || cells.some((value) => value.includes('медиаторнинг ф.и.о'))) {
        headerRowNumber = rowNumber;
        headers = candidate;
        break;
      }
    }
    const columns = new Map<string, number>();
    headers.slice(1).forEach((header, index) => {
      if (header !== null && header !== undefined) columns.set(String(header).trim().toLowerCase(), index + 1);
    });
    const isQashqadaryoSample = !columns.has('fullname') &&
      headers.some((header) => String(header ?? '').toLocaleLowerCase().includes('медиаторнинг ф.и.о'));
    if (isQashqadaryoSample) {
      columns.clear();
      columns.set('source_registered_at', 2);
      columns.set('fullname', 3);
      columns.set('specialization', 4);
      columns.set('languages', 5);
      columns.set('source_certificate', 6);
      columns.set('source_contact', 7);
      columns.set('source_removed_at', 8);
    }
    if (!columns.has('fullname')) throw new BadRequestException('Excel sarlavhasida fullName ustuni yoki Qashqadaryo reyestri sarlavhasi bo\'lishi kerak');

    const errors: Array<{ row: number; reason: string; data?: Record<string, string> }> = [];
    let imported = 0;
    let duplicates = 0;
    let totalRows = 0;

    for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const rowData: Record<string, string> = {};
      for (const [header, column] of columns) rowData[header] = this.cellText(row.getCell(column));
      if (!Object.values(rowData).some((value) => value.trim())) continue;
      totalRows++;

      try {
        if (isQashqadaryoSample) {
          if (rowData.source_removed_at && !rowData.source_removed_at.toLocaleLowerCase().includes('чиқарилмаган')) {
            throw new Error('Reyestrdan chiqarilgan mediator faol namuna sifatida import qilinmadi');
          }
          const contact = rowData.source_contact || '';
          rowData.type = 'MEDIATOR';
          rowData.region = 'Qashqadaryo viloyati';
          rowData.isSample = 'true';
          rowData.registeredAt = this.extractSourceDate(rowData.source_registered_at);
          rowData.certificateNumber = this.extractCertificateNumber(rowData.source_certificate);
          rowData.certificateIssuedAt = this.extractSourceDate(rowData.source_certificate);
          rowData.address = contact;
          rowData.phone = this.extractUzbekPhone(contact);
        }
        const type = this.parseRegistryType(rowData.type);
        const fullName = rowData.fullname.trim();
        const region = rowData.region.trim();
        const registryNumber = this.clean(rowData.registrynumber);
        const pinfl = this.clean(rowData.pinfl);
        const isSample = /^(true|1|yes|ha|demo)$/i.test(rowData.issample?.trim() || '');
        if (!fullName || !region) throw new Error('fullName va region ustunlari majburiy');
        if (!registryNumber && !pinfl && !isSample) throw new Error('registryNumber yoki pinfl majburiy');
        if (isSample && type !== RegistryType.MEDIATOR) throw new Error('Namuna rejimida faqat mediator yozuvlarini import qilish mumkin');
        if (pinfl && !/^\d{14}$/.test(pinfl)) throw new Error('pinfl 14 ta raqamdan iborat bo\'lishi kerak');

        const duplicate = await this.prisma.registryEntry.findFirst({
          where: isSample && !registryNumber && !pinfl
            ? { type, fullName, region, deletedAt: null, isSample: true }
            : {
                type,
                deletedAt: null,
                OR: [
                  ...(registryNumber ? [{ registryNumber }] : []),
                  ...(pinfl ? [{ pinfl }] : []),
                ],
              },
          select: { id: true },
        });
        if (duplicate) {
          duplicates++;
          errors.push({ row: rowNumber, reason: 'Takroriy reyestr yozuvi', ...(isSample ? {} : { data: rowData }) });
          continue;
        }

        if (isSample && !registryNumber && !pinfl) {
          const officialEntry = await this.prisma.registryEntry.findFirst({
            where: { type, fullName, region, deletedAt: null, isSample: false },
            select: { id: true },
          });
          if (officialEntry) {
            duplicates++;
            errors.push({ row: rowNumber, reason: 'Shu ism va hudud bo‘yicha rasmiy yozuv mavjud; namuna yozuvi qo‘shilmadi' });
            continue;
          }
        }

        this.assertRegionAccess(region, actor);
        const linkedUser = pinfl
          ? await this.prisma.user.findUnique({ where: { pinfl } })
          : null;
        const latitude = this.optionalNumber(rowData.latitude);
        const longitude = this.optionalNumber(rowData.longitude);
        if ((latitude === null) !== (longitude === null)) {
          throw new Error('latitude va longitude birgalikda berilishi kerak');
        }
        const cellValue = (key: string) => {
          const column = columns.get(key);
          return column ? row.getCell(column).value : undefined;
        };
        const birthDate = this.parseSpreadsheetDate(rowData.birthdate, cellValue('birthdate'));
        const registeredAt = this.parseSpreadsheetDate(rowData.registeredat, cellValue('registeredat')) || new Date();
        const entry = await this.prisma.registryEntry.create({
          data: {
            registryNumber,
            pinfl,
            userId: linkedUser?.id,
            type,
            fullName,
            phone: this.clean(rowData.phone) || linkedUser?.phone,
            email: this.clean(rowData.email) || linkedUser?.email,
            region,
            address: this.clean(rowData.address) || linkedUser?.address,
            gender: this.normalizeGender(rowData.gender) || linkedUser?.gender,
            birthDate,
            education: this.clean(rowData.education),
            specialization: this.splitList(rowData.specialization),
            languages: this.splitList(rowData.languages),
            photoUrl: this.safePhotoUrl(rowData.photourl),
            latitude,
            longitude,
            certificateNumber: this.clean(rowData.certificatenumber),
            certificateIssuedAt: this.parseSpreadsheetDate(rowData.certificateissuedat, cellValue('certificateissuedat')),
            certificateExpiresAt: this.parseSpreadsheetDate(rowData.certificateexpiresat, cellValue('certificateexpiresat')),
            registeredAt,
            isSample,
            publicProfile: isSample ? true : undefined,
            createdById: actor.id,
            status: RegistryEntryStatus.ACTIVE,
          },
        });
        await this.prisma.registryStatusHistory.create({
          data: {
            registryEntryId: entry.id,
            status: RegistryEntryStatus.ACTIVE,
            reason: `Excel import: ${file.originalname}`,
            changedById: actor.id,
          },
        });
        if (linkedUser) {
          await this.prisma.$transaction((tx) => this.syncLinkedUser(tx, entry, linkedUser.id));
        }
        await this.audit.log({
          userId: actor.id,
          username: actor.username,
          userFullName: actor.fullName,
          action: 'IMPORT_REGISTRY_ENTRY',
          entityType: 'REGISTRY_ENTRY',
          entityId: entry.id,
          newValues: this.auditSnapshot(entry),
          ipAddress,
        });
        if (!isSample) await this.enqueueMyGovSync(entry.id, 'UPSERT');
        imported++;
      } catch (error) {
        const isSample = /^(true|1|yes|ha|demo)$/i.test(rowData.issample?.trim() || '');
        errors.push({ row: rowNumber, reason: error.message || 'Qatorni import qilishda xatolik', ...(isSample ? {} : { data: rowData }) });
      }
    }

    const report = await this.prisma.registryImport.create({
      data: {
        fileName: file.originalname,
        createdById: actor.id,
        totalRows,
        imported,
        duplicates,
        errorCount: errors.length,
        errors: errors as Prisma.InputJsonValue,
      },
    });
    return {
      id: report.id,
      fileName: report.fileName,
      totalRows,
      imported,
      duplicates,
      errorCount: errors.length,
      errors,
    };
  }

  async getImportResult(id: string, actor: AuthUser) {
    const report = await this.prisma.registryImport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Import hisoboti topilmadi');
    if (
      !actor.roles.includes('ADMIN') &&
      !actor.roles.includes('MINISTRY_STAFF') &&
      report.createdById !== actor.id
    ) {
      throw new ForbiddenException('Ushbu import hisobotini ko\'rishga ruxsat yo\'q');
    }
    return report;
  }

  async createImportTemplate() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import');
    sheet.columns = IMPORT_HEADERS.map((header) => ({ header, key: header, width: 22 }));
    sheet.addRow({
      registryNumber: 'REG-0001',
      pinfl: '31201851230011',
      type: 'MEDIATOR',
      fullName: 'Karimov Alisher Baxtiyorovich',
      region: 'Toshkent shahri',
      address: 'Toshkent shahri',
      gender: 'MALE',
      education: 'Yurisprudensiya',
      specialization: 'FAMILY; CIVIL',
      languages: 'uz; ru',
      isSample: false,
      latitude: 41.3111,
      longitude: 69.2797,
    });
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async runMyGovSyncQueue() {
    const pending = await this.prisma.registryMyGovSync.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: 10 },
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });
    await Promise.all(pending.map((sync) => this.processMyGovSync(sync.id)));
    return { examined: pending.length };
  }

  async checkCertificateExpirations(now = new Date()) {
    const warningEnd = new Date(now);
    warningEnd.setDate(warningEnd.getDate() + 30);
    const expired = await this.prisma.registryEntry.findMany({
      where: { type: RegistryType.MEDIATOR, status: RegistryEntryStatus.ACTIVE, deletedAt: null, certificateExpiresAt: { lt: now } },
      select: { id: true, userId: true, certificateExpiresAt: true },
    });
    for (const entry of expired) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.registryEntry.updateMany({ where: { id: entry.id, status: RegistryEntryStatus.ACTIVE }, data: { status: RegistryEntryStatus.SUSPENDED } });
        if (updated.count) {
          await tx.registryStatusHistory.create({ data: { registryEntryId: entry.id, previousStatus: RegistryEntryStatus.ACTIVE, status: RegistryEntryStatus.SUSPENDED, reason: 'Malaka guvohnomasining amal qilish muddati tugadi', changedById: null } });
          const current = await tx.registryEntry.findUnique({ where: { id: entry.id } });
          if (current?.userId) await this.syncLinkedUser(tx, current, current.userId);
        }
      });
      await this.enqueueMyGovSync(entry.id, 'STATUS_CHANGE');
    }
    const expiring = await this.prisma.registryEntry.findMany({
      where: { type: RegistryType.MEDIATOR, status: RegistryEntryStatus.ACTIVE, deletedAt: null, certificateExpiresAt: { gte: now, lte: warningEnd } },
      select: { id: true, userId: true, registryNumber: true, certificateExpiresAt: true },
    });
    const notified: string[] = [];
    for (const entry of expiring) {
      if (!entry.certificateExpiresAt) continue;
      const day = entry.certificateExpiresAt.toISOString().slice(0, 10);
      if (entry.userId) await this.notifications.send({
        userId: entry.userId,
        templateCode: 'APPLICATION_STATUS',
        variables: { title: 'Malaka guvohnomasi muddati', content: `Mediator guvohnomangiz ${day} kuni tugaydi. Reyestrdagi holatingizni yangilash uchun Adliya organiga murojaat qiling.` },
        idempotencyKey: `mediator-certificate-expiry-${entry.id}-${day}`,
        channels: [NotificationChannel.CABINET],
      });
      notified.push(entry.id);
    }
    if (notified.length) {
      const ministry = await this.prisma.user.findMany({
        where: { userRoles: { some: { role: { name: 'MINISTRY_STAFF' } } } },
        select: { id: true },
      });
      for (const staff of ministry) {
        for (const entry of expiring) {
          if (!entry.certificateExpiresAt) continue;
          const day = entry.certificateExpiresAt.toISOString().slice(0, 10);
          await this.notifications.send({
            userId: staff.id,
            templateCode: 'APPLICATION_STATUS',
            variables: { title: 'Guvohnoma muddati tugayotgan mediator', content: `${entry.registryNumber || 'Reyestr yozuvi'} guvohnomasi ${day} kuni tugaydi.` },
            idempotencyKey: `mediator-certificate-expiry-ministry-${entry.id}-${day}-${staff.id}`,
            channels: [NotificationChannel.CABINET],
          });
        }
      }
    }
    return { expired: expired.length, warned: notified.length };
  }

  private staffWhere(query: RegistryQueryDto, actor: AuthUser): Prisma.RegistryEntryWhereInput {
    const isRegionScoped = actor.roles.includes('REGIONAL_STAFF') && !actor.roles.includes('ADMIN');
    const region = isRegionScoped
      ? actor.region || '__NO_REGION__'
      : query.region;
    const where: Prisma.RegistryEntryWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(region
        ? {
            region: isRegionScoped
              ? { equals: region, mode: 'insensitive' }
              : { contains: region, mode: 'insensitive' },
          }
        : {}),
      ...(query.gender ? { gender: { equals: query.gender, mode: 'insensitive' } } : {}),
      ...(query.specialization ? { specialization: { has: query.specialization } } : {}),
      ...(query.registeredYear
        ? {
            registeredAt: {
              gte: new Date(`${query.registeredYear}-01-01T00:00:00.000Z`),
              lt: new Date(`${query.registeredYear + 1}-01-01T00:00:00.000Z`),
            },
          }
        : {}),
      ...(query.ageMin !== undefined || query.ageMax !== undefined
        ? { birthDate: this.birthDateRange(query.ageMin, query.ageMax) }
        : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { registryNumber: { contains: query.search, mode: 'insensitive' } },
              { pinfl: { contains: query.search } },
              { phone: { contains: query.search } },
              { region: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return where;
  }

  private birthDateRange(ageMin?: number, ageMax?: number): Prisma.DateTimeNullableFilter {
    const today = new Date();
    const range: Prisma.DateTimeNullableFilter = {};
    if (ageMin !== undefined) {
      const youngestBirthDate = new Date(today);
      youngestBirthDate.setFullYear(today.getFullYear() - ageMin);
      range.lte = youngestBirthDate;
    }
    if (ageMax !== undefined) {
      const oldestBirthDate = new Date(today);
      oldestBirthDate.setFullYear(today.getFullYear() - ageMax - 1);
      range.gt = oldestBirthDate;
    }
    return range;
  }

  private async getEntry(id: string) {
    const entry = await this.prisma.registryEntry.findFirst({ where: { id, deletedAt: null } });
    if (!entry) throw new NotFoundException('Reyestr yozuvi topilmadi');
    return entry;
  }

  private assertRegionAccess(region: string, actor: AuthUser) {
    if (actor.roles.includes('ADMIN') || actor.roles.includes('MINISTRY_STAFF')) return;
    if (!actor.roles.includes('REGIONAL_STAFF')) {
      throw new ForbiddenException('Reyestrni boshqarish vakolati yo\'q');
    }
    if (!actor.region || actor.region.toLocaleLowerCase() !== region.toLocaleLowerCase()) {
      throw new ForbiddenException('Faqat o\'z hududingizdagi reyestr yozuvlarini boshqarishingiz mumkin');
    }
  }

  private async resolveUser(userId?: string, pinfl?: string | null) {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : pinfl
        ? await this.prisma.user.findUnique({ where: { pinfl } })
        : null;
    if (userId && !user) throw new BadRequestException('Bog\'langan platforma foydalanuvchisi topilmadi');
    return user;
  }

  private async assertNotDuplicate(
    type: RegistryType,
    registryNumber?: string | null,
    pinfl?: string | null,
    userId?: string | null,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.registryEntry.findFirst({
      where: {
        type,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          ...(registryNumber ? [{ registryNumber }] : []),
          ...(pinfl ? [{ pinfl }] : []),
          ...(userId ? [{ userId }] : []),
        ],
      },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('Bu shaxs yoki reyestr raqami bo\'yicha yozuv mavjud');
  }

  private async syncLinkedUser(tx: Prisma.TransactionClient, entry: any, userId: string) {
    const userType = {
      [RegistryType.MEDIATOR]: RegistryStatus.MEDIATOR,
      [RegistryType.ARBITRATION_JUDGE]: RegistryStatus.ARBITRATION_JUDGE,
      [RegistryType.ARBITRATOR]: RegistryStatus.ARBITRATOR,
    }[entry.type];
    const cabinetType = {
      [RegistryType.MEDIATOR]: CabinetType.SPECIALIST,
      [RegistryType.ARBITRATION_JUDGE]: CabinetType.SPECIALIST,
      [RegistryType.ARBITRATOR]: CabinetType.SPECIALIST,
    }[entry.type];
    await tx.user.update({
      where: { id: userId },
      data: { registryStatus: userType, cabinetType },
    });
    if (entry.type === RegistryType.MEDIATOR) {
      const dossierStatus = {
        [RegistryEntryStatus.ACTIVE]: MediatorRegistryStatus.ACTIVE,
        [RegistryEntryStatus.SUSPENDED]: MediatorRegistryStatus.SUSPENDED,
        [RegistryEntryStatus.REVOKED]: MediatorRegistryStatus.REVOKED,
      }[entry.status];
      await tx.mediatorDossier.upsert({
        where: { mediatorId: userId },
        create: {
          mediatorId: userId,
          registeredYear: entry.registeredAt.getFullYear(),
          region: entry.region,
          specialization: entry.specialization,
          registryStatus: dossierStatus,
          isPublic: entry.publicProfile,
        },
        update: {
          registeredYear: entry.registeredAt.getFullYear(),
          region: entry.region,
          specialization: entry.specialization,
          registryStatus: dossierStatus,
          isPublic: entry.publicProfile,
        },
      });
    }
  }

  private async enqueueMyGovSync(id: string, eventType: string) {
    const entry = await this.prisma.registryEntry.findUnique({ where: { id } });
    if (!entry) return;
    let sync;
    try {
      sync = await this.prisma.registryMyGovSync.create({
        data: {
          registryEntryId: id,
          eventType,
          payload: { ...this.publicProjection(entry), eventType } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`my.gov.uz sinxronizatsiya navbatiga yozib bo'lmadi: ${error.message}`);
      return;
    }
    void this.processMyGovSync(sync.id).catch((error) =>
      this.logger.error(`my.gov.uz sinxronizatsiyasi xatosi: ${error.message}`),
    );
  }

  private async processMyGovSync(id: string) {
    if (this.syncInProgress.has(id)) return;
    this.syncInProgress.add(id);
    try {
      const sync = await this.prisma.registryMyGovSync.findUnique({ where: { id } });
      if (!sync || sync.status === 'SUCCESS' || sync.attempts >= 10) return;
      try {
        await this.myGov.pushRegistryEntry(sync.payload as Prisma.InputJsonValue);
        await this.prisma.registryMyGovSync.update({
          where: { id },
          data: { status: 'SUCCESS', attempts: { increment: 1 }, syncedAt: new Date(), lastError: null },
        });
      } catch (error) {
        const attempts = sync.attempts + 1;
        const delayMinutes = Math.min(60, 2 ** attempts);
        await this.prisma.registryMyGovSync.update({
          where: { id },
          data: {
            status: 'FAILED',
            attempts,
            nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
            lastError: String(error.message || error).slice(0, 2000),
          },
        });
      }
    } finally {
      this.syncInProgress.delete(id);
    }
  }

  private publicProjection(entry: any) {
    return {
      id: entry.id,
      registryNumber: entry.registryNumber,
      type: entry.type,
      fullName: entry.fullName,
      photoUrl: entry.photoUrl,
      region: entry.region,
      education: entry.education,
      specialization: entry.specialization,
      languages: entry.languages,
      latitude: entry.latitude,
      longitude: entry.longitude,
      status: entry.status,
      isSample: entry.isSample,
      certificateNumber: entry.certificateNumber,
      certificateIssuedAt: entry.certificateIssuedAt,
      certificateExpiresAt: entry.certificateExpiresAt,
      registeredAt: entry.registeredAt,
      profileUrl: `/public/mediators/${entry.id}`,
      rating: entry.ratings?.[0]
        ? {
            score: entry.ratings[0].score,
            periodYear: entry.ratings[0].periodYear,
            metrics: entry.ratings[0].metrics,
            calculatedAt: entry.ratings[0].calculatedAt,
          }
        : null,
    };
  }

  private auditSnapshot(entry: any) {
    return {
      type: entry.type,
      registryNumber: entry.registryNumber,
      pinfl: entry.pinfl,
      fullName: entry.fullName,
      phone: entry.phone,
      region: entry.region,
      address: entry.address,
      status: entry.status,
      isSample: entry.isSample,
      specialization: entry.specialization,
      languages: entry.languages,
    };
  }

  private exportRow(entry: any) {
    return {
      registryNumber: entry.registryNumber,
      pinfl: entry.pinfl,
      type: entry.type,
      fullName: entry.fullName,
      phone: entry.phone,
      email: entry.email,
      region: entry.region,
      address: entry.address,
      gender: entry.gender,
      birthDate: entry.birthDate,
      education: entry.education,
      specialization: entry.specialization.join('; '),
      languages: entry.languages.join('; '),
      photoUrl: entry.photoUrl,
      latitude: entry.latitude,
      longitude: entry.longitude,
      certificateNumber: entry.certificateNumber,
      certificateIssuedAt: entry.certificateIssuedAt,
      certificateExpiresAt: entry.certificateExpiresAt,
      registeredAt: entry.registeredAt,
      isSample: entry.isSample,
    };
  }

  private parseRegistryType(value?: string): RegistryType {
    const normalized = value?.trim().toUpperCase();
    if (!normalized || normalized === 'MEDIATOR') return RegistryType.MEDIATOR;
    if (normalized === 'ARBITRATION_JUDGE' || normalized === 'HAKAMLIK_SUDI') return RegistryType.ARBITRATION_JUDGE;
    if (normalized === 'ARBITRATOR' || normalized === 'ARBITR') return RegistryType.ARBITRATOR;
    throw new Error('type MEDIATOR, ARBITRATION_JUDGE yoki ARBITRATOR bo\'lishi kerak');
  }

  private parseBirthDate(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseSpreadsheetDate(value?: string, rawValue?: ExcelJS.CellValue) {
    if (rawValue instanceof Date) return rawValue;
    if (typeof rawValue === 'number') {
      return new Date(Date.UTC(1899, 11, 30) + rawValue * 86_400_000);
    }
    if (!value?.trim()) return null;
    const localizedDate = value.match(/(?:^|\D)(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\D|$)/);
    if (localizedDate) {
      const [, day, month, year] = localizedDate;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    const date = new Date(value.trim());
    if (Number.isNaN(date.getTime())) throw new Error(`Sana yaroqsiz: ${value}`);
    return date;
  }

  private extractSourceDate(value?: string) {
    return value?.match(/\d{1,2}[./]\d{1,2}[./]\d{4}/)?.[0] || '';
  }

  private extractCertificateNumber(value?: string) {
    return value?.match(/(?:МТ|MT)\s*№?\s*([A-Za-zА-Яа-я0-9/-]+)/i)?.[1] || '';
  }

  private extractUzbekPhone(value?: string) {
    const candidate = value?.match(/\+?\s*998[\s()-]*\d{2}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/)?.[0];
    if (!candidate) return '';
    const digits = candidate.replace(/\D/g, '');
    return digits.length === 12 ? `+${digits}` : '';
  }

  private optionalNumber(value?: string) {
    if (!value?.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`Son qiymati yaroqsiz: ${value}`);
    return parsed;
  }

  private normalizeGender(value?: string) {
    const normalized = this.clean(value)?.toUpperCase();
    if (normalized === 'ERKAK') return 'MALE';
    if (normalized === 'AYOL') return 'FEMALE';
    return normalized;
  }

  private splitList(value?: string) {
    return value?.split(/[;,|]/).map((item) => item.trim()).filter(Boolean) || [];
  }

  private cleanList(values?: string[]) {
    return values?.map((item) => item.trim()).filter(Boolean) || [];
  }

  private safePhotoUrl(value?: string) {
    const url = this.clean(value);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error();
      return parsed.toString();
    } catch {
      throw new BadRequestException('Rasm manzili HTTPS URL bo\'lishi kerak');
    }
  }

  private cellText(cell: ExcelJS.Cell) {
    const value = cell.value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && value && 'text' in value) return String(value.text || '').trim();
    return cell.text?.trim() || '';
  }

  private clean(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private pagination(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
