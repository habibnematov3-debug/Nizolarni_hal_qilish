import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus, ReportSummaryStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsHandlerService } from '../notifications/services/events-handler.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { OptionalReportPeriodDto, ReportPeriodDto } from './dto/report-period.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportExportFormat } from './dto/export-analytics.dto';

const CABINET_ROLES = ['MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR'];

function currentPeriod(): ReportPeriodDto {
  const now = new Date();
  return { year: now.getUTCFullYear(), quarter: Math.floor(now.getUTCMonth() / 3) + 1 };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function sumNumericValues(target: Record<string, number>, value: unknown, prefix = '') {
  for (const [key, item] of Object.entries(asRecord(value))) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'number' && Number.isFinite(item)) {
      target[path] = (target[path] || 0) + item;
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      sumNumericValues(target, item, path);
    }
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ascii(value: unknown) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventsHandler: EventsHandlerService,
  ) {}

  private requireOrganization(user: AuthUser) {
    if (!user.organizationId) {
      throw new BadRequestException('Foydalanuvchi hududiy adliya organiga biriktirilmagan');
    }
    return user.organizationId;
  }

  private assertCabinetRole(user: AuthUser) {
    if (user.roles?.some((role) => CABINET_ROLES.includes(role)) || user.roles?.includes('ADMIN')) return;
    throw new ForbiddenException('Hisobotlar faqat mediator, hakamlik sudyasi yoki arbitr uchun mavjud');
  }

  private async prefill(user: AuthUser, period: ReportPeriodDto) {
    const [claims, certificates, notifications] = await Promise.all([
      this.prisma.courtClaim.count(),
      this.prisma.trainingCertificate.count({ where: { pinfl: user.pinfl || undefined } }),
      this.prisma.notification.count({ where: { userId: user.id } }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: { year: period.year, quarter: period.quarter },
      mediator: { id: user.id, fullName: user.fullName, pinfl: user.pinfl || null },
      availablePlatformData: { courtClaims: claims, certificates, notifications },
    };
  }

  async getCurrent(user: AuthUser) {
    this.assertCabinetRole(user);
    const period = currentPeriod();
    const organizationId = this.requireOrganization(user);
    const prefilledData = await this.prefill(user, period);
    return this.prisma.quarterlyReport.upsert({
      where: { mediatorId_periodYear_periodQuarter: { mediatorId: user.id, periodYear: period.year, periodQuarter: period.quarter } },
      create: { mediatorId: user.id, organizationId, periodYear: period.year, periodQuarter: period.quarter, prefilledData: prefilledData as Prisma.InputJsonValue },
      update: { prefilledData: prefilledData as Prisma.InputJsonValue },
      include: { organization: true },
    });
  }

  async listCabinet(user: AuthUser, query: ReportsQueryDto) {
    this.assertCabinetRole(user);
    const where: Prisma.QuarterlyReportWhereInput = { mediatorId: user.id };
    if (query.year) where.periodYear = query.year;
    if (query.quarter) where.periodQuarter = query.quarter;
    if (query.status) where.status = query.status;
    const [total, items] = await Promise.all([
      this.prisma.quarterlyReport.count({ where }),
      this.prisma.quarterlyReport.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: [{ periodYear: 'desc' }, { periodQuarter: 'desc' }] }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  private async getOwnedReport(id: string, user: AuthUser) {
    const report = await this.prisma.quarterlyReport.findUnique({ where: { id }, include: { organization: true, mediator: true } });
    if (!report) throw new NotFoundException('Hisobot topilmadi');
    if (report.mediatorId !== user.id && !user.roles?.includes('ADMIN')) throw new ForbiddenException('Hisobot sizga tegishli emas');
    return report;
  }

  async update(id: string, dto: UpdateReportDto, user: AuthUser, ipAddress?: string, userAgent?: string) {
    this.assertCabinetRole(user);
    const report = await this.getOwnedReport(id, user);
    if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.RETURNED) throw new ConflictException('Yuborilgan hisobotni tahrirlab bo\'lmaydi');
    const updated = await this.prisma.quarterlyReport.update({
      where: { id },
      data: { additionalData: { ...asRecord(report.additionalData), ...dto.additionalData } as Prisma.InputJsonValue, returnReason: null },
      include: { organization: true },
    });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'UPDATE_REPORT', entityType: 'HIS_REPORT', entityId: id, newValues: dto.additionalData, ipAddress, userAgent });
    return updated;
  }

  async submit(id: string, user: AuthUser, ipAddress?: string, userAgent?: string) {
    this.assertCabinetRole(user);
    const report = await this.getOwnedReport(id, user);
    if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.RETURNED) throw new ConflictException('Hisobot ushbu holatda yuborilmaydi');
    const updated = await this.prisma.quarterlyReport.update({ where: { id }, data: { status: ReportStatus.SUBMITTED, submittedAt: new Date(), returnReason: null } });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'SUBMIT_REPORT', entityType: 'HIS_REPORT', entityId: id, ipAddress, userAgent });
    void this.eventsHandler.handleEvent({ eventName: 'HisobotYuborildi', sourceModule: 'HIS', userId: user.id, variables: { reportId: id, year: report.periodYear, quarter: report.periodQuarter }, channels: [] }).catch(() => undefined);
    return updated;
  }

  private staffWhere(user: AuthUser, query: ReportsQueryDto): Prisma.QuarterlyReportWhereInput {
    const where: Prisma.QuarterlyReportWhereInput = {};
    if (!user.roles?.includes('MINISTRY_STAFF') && !user.roles?.includes('ADMIN')) where.organizationId = this.requireOrganization(user);
    if (query.year) where.periodYear = query.year;
    if (query.quarter) where.periodQuarter = query.quarter;
    if (query.status) where.status = query.status;
    if (query.mediatorId) where.mediatorId = query.mediatorId;
    return where;
  }

  async listStaff(user: AuthUser, query: ReportsQueryDto) {
    if (!user.roles?.some((role) => ['REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Hisobotlarni ko\'rish uchun xodim roli kerak');
    const where = this.staffWhere(user, query);
    const [total, items] = await Promise.all([
      this.prisma.quarterlyReport.count({ where }),
      this.prisma.quarterlyReport.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, include: { mediator: true, organization: true }, orderBy: { updatedAt: 'desc' } }),
    ]);
    return { items, pagination: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) } };
  }

  async getStaffReport(id: string, user: AuthUser) {
    if (!user.roles?.some((role) => ['REGIONAL_STAFF', 'MINISTRY_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Hisobotlarni ko\'rish uchun xodim roli kerak');
    const report = await this.prisma.quarterlyReport.findUnique({ where: { id }, include: { mediator: true, organization: true } });
    if (!report) throw new NotFoundException('Hisobot topilmadi');
    if (!user.roles.includes('MINISTRY_STAFF') && !user.roles.includes('ADMIN') && report.organizationId !== user.organizationId) throw new ForbiddenException('Hisobot boshqa hududga tegishli');
    return report;
  }

  async returnReport(id: string, reason: string, user: AuthUser, ipAddress?: string, userAgent?: string) {
    const report = await this.getStaffReport(id, user);
    if (report.status !== ReportStatus.SUBMITTED) throw new ConflictException('Faqat yuborilgan hisobot qaytarilishi mumkin');
    const updated = await this.prisma.quarterlyReport.update({ where: { id }, data: { status: ReportStatus.RETURNED, returnReason: reason, reviewedAt: new Date() } });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'RETURN_REPORT', entityType: 'HIS_REPORT', entityId: id, newValues: { reason }, ipAddress, userAgent });
    void this.eventsHandler.handleEvent({ eventName: 'HisobotQaytarildi', sourceModule: 'HIS', userId: report.mediatorId, variables: { reportId: id, reason }, channels: [] }).catch(() => undefined);
    return updated;
  }

  async acceptReport(id: string, user: AuthUser, ipAddress?: string, userAgent?: string) {
    const report = await this.getStaffReport(id, user);
    if (report.status !== ReportStatus.SUBMITTED) throw new ConflictException('Faqat yuborilgan hisobot qabul qilinadi');
    const updated = await this.prisma.quarterlyReport.update({ where: { id }, data: { status: ReportStatus.ACCEPTED, reviewedAt: new Date() } });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'ACCEPT_REPORT', entityType: 'HIS_REPORT', entityId: id, ipAddress, userAgent });
    return updated;
  }

  async createSummary(period: ReportPeriodDto, user: AuthUser, ipAddress?: string, userAgent?: string) {
    if (!user.roles?.some((role) => ['REGIONAL_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Jamlanma faqat hududiy adliya xodimi uchun');
    const organizationId = this.requireOrganization(user);
    const reports = await this.prisma.quarterlyReport.findMany({ where: { organizationId, periodYear: period.year, periodQuarter: period.quarter, status: { in: [ReportStatus.SUBMITTED, ReportStatus.ACCEPTED] } } });
    const totals: Record<string, number> = {};
    reports.forEach((report) => sumNumericValues(totals, report.additionalData));
    const aggregateData = { period: { year: period.year, quarter: period.quarter }, reportCount: reports.length, totals };
    const existing = await this.prisma.reportSummary.findUnique({ where: { organizationId_periodYear_periodQuarter: { organizationId, periodYear: period.year, periodQuarter: period.quarter } } });
    if (existing?.status === ReportSummaryStatus.SUBMITTED) throw new ConflictException('Ushbu davr jamlanmasi allaqachon yuborilgan');
    const summary = await this.prisma.reportSummary.upsert({
      where: { organizationId_periodYear_periodQuarter: { organizationId, periodYear: period.year, periodQuarter: period.quarter } },
      create: { organizationId, createdById: user.id, periodYear: period.year, periodQuarter: period.quarter, reportCount: reports.length, aggregateData: aggregateData as Prisma.InputJsonValue },
      update: { reportCount: reports.length, aggregateData: aggregateData as Prisma.InputJsonValue, createdById: user.id },
      include: { organization: true },
    });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_REPORT_SUMMARY', entityType: 'HIS_SUMMARY', entityId: summary.id, newValues: aggregateData, ipAddress, userAgent });
    return summary;
  }

  async submitSummary(id: string, user: AuthUser, ipAddress?: string, userAgent?: string) {
    if (!user.roles?.some((role) => ['REGIONAL_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Jamlanmani faqat hududiy adliya xodimi yuboradi');
    const summary = await this.prisma.reportSummary.findUnique({ where: { id } });
    if (!summary) throw new NotFoundException('Jamlanma topilmadi');
    if (!user.roles.includes('ADMIN') && summary.organizationId !== user.organizationId) throw new ForbiddenException('Jamlanma boshqa hududga tegishli');
    if (summary.status !== ReportSummaryStatus.DRAFT) throw new ConflictException('Jamlanma ushbu holatda yuborilmaydi');
    const updated = await this.prisma.reportSummary.update({ where: { id }, data: { status: ReportSummaryStatus.SUBMITTED, submittedAt: new Date() } });
    await this.auditService.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'SUBMIT_REPORT_SUMMARY', entityType: 'HIS_SUMMARY', entityId: id, ipAddress, userAgent });
    return updated;
  }

  async ministrySummaries(user: AuthUser, query: OptionalReportPeriodDto | undefined) {
    if (!user.roles?.some((role) => ['MINISTRY_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Jamlanmalar faqat Vazirlik xodimi uchun');
    const where: Prisma.ReportSummaryWhereInput = { status: ReportSummaryStatus.SUBMITTED };
    if (query?.year) where.periodYear = query.year;
    if (query?.quarter) where.periodQuarter = query.quarter;
    return this.prisma.reportSummary.findMany({ where, include: { organization: true }, orderBy: [{ periodYear: 'desc' }, { periodQuarter: 'desc' }] });
  }

  async analytics(user: AuthUser, period?: OptionalReportPeriodDto) {
    if (!user.roles?.some((role) => ['MINISTRY_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Tahlil faqat Vazirlik xodimi uchun');
    const where: Prisma.QuarterlyReportWhereInput = { status: { in: [ReportStatus.SUBMITTED, ReportStatus.ACCEPTED, ReportStatus.FORWARDED] } };
    if (period?.year) where.periodYear = period.year;
    if (period?.quarter) where.periodQuarter = period.quarter;
    const reports = await this.prisma.quarterlyReport.findMany({ where, include: { organization: true } });
    const totals: Record<string, number> = {};
    const byRegion: Record<string, { organizationId: string; organizationName: string; reportCount: number; totals: Record<string, number> }> = {};
    for (const report of reports) {
      sumNumericValues(totals, report.additionalData);
      const key = report.organizationId;
      byRegion[key] ||= { organizationId: key, organizationName: report.organization.name, reportCount: 0, totals: {} };
      byRegion[key].reportCount += 1;
      sumNumericValues(byRegion[key].totals, report.additionalData);
    }
    return { period: period || null, reportCount: reports.length, totals, byRegion: Object.values(byRegion) };
  }

  async exportAnalytics(user: AuthUser, format: ReportExportFormat, period?: ReportPeriodDto) {
    const data = await this.analytics(user, period);
    const title = `HIS analytics${period ? ` ${period.year}-Q${period.quarter}` : ''}`;
    if (format === 'excel') {
      const rows = Object.entries(data.totals).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${value}</td></tr>`).join('');
      const regions = data.byRegion.map((item) => `<tr><td>${escapeHtml(item.organizationName)}</td><td>${item.reportCount}</td><td>${escapeHtml(JSON.stringify(item.totals))}</td></tr>`).join('');
      return { buffer: Buffer.from(`<html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(title)}</h1><p>Reports: ${data.reportCount}</p><h2>Totals</h2><table><tr><th>Metric</th><th>Value</th></tr>${rows}</table><h2>By region</h2><table><tr><th>Organization</th><th>Reports</th><th>Totals</th></tr>${regions}</table></body></html>`), contentType: 'application/vnd.ms-excel', filename: 'his-analytics.xls' };
    }
    const lines = [title, `Reports: ${data.reportCount}`, '', 'Totals:', ...Object.entries(data.totals).map(([key, value]) => `${key}: ${value}`), '', 'By region:', ...data.byRegion.map((item) => `${item.organizationName}: ${item.reportCount} reports`)];
    if (format === ReportExportFormat.DOCX) return { buffer: await this.createDocx(lines), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'his-analytics.docx' };
    return { buffer: this.createPdf(lines), contentType: 'application/pdf', filename: 'his-analytics.pdf' };
  }

  async exportStaffReports(user: AuthUser, format: ReportExportFormat, period?: OptionalReportPeriodDto) {
    if (!user.roles?.some((role) => ['REGIONAL_STAFF', 'ADMIN'].includes(role))) throw new ForbiddenException('Hududiy hisobotlarni eksport qilish uchun hududiy xodim roli kerak');
    const reports = await this.prisma.quarterlyReport.findMany({
      where: this.staffWhere(user, { page: 1, limit: 100000, ...period }),
      include: { mediator: true, organization: true },
      orderBy: [{ periodYear: 'desc' }, { periodQuarter: 'desc' }, { updatedAt: 'desc' }],
    });
    const title = `Hududiy hisobotlar${period ? ` · ${period.year}-yil ${period.quarter}-chorak` : ''}`;
    const rows = reports.map((report) => {
      const data = asRecord(report.additionalData);
      return {
        period: `${report.periodYear}-yil ${report.periodQuarter}-chorak`,
        mediator: report.mediator?.fullName || '',
        region: report.organization?.region || report.organization?.name || '',
        status: report.status,
        sessions: Number(data.mediationSessions) || 0,
        resolved: Number(data.resolvedCases) || 0,
        notes: String(data.notes || report.returnReason || ''),
      };
    });
    if (format === ReportExportFormat.EXCEL) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Hududiy hisobotlar');
      sheet.columns = [
        { header: 'Davr', key: 'period', width: 22 },
        { header: 'Mediator', key: 'mediator', width: 30 },
        { header: 'Hudud', key: 'region', width: 28 },
        { header: 'Holat', key: 'status', width: 18 },
        { header: 'Mediatsiya sessiyalari', key: 'sessions', width: 24 },
        { header: 'Yakunlangan nizolar', key: 'resolved', width: 22 },
        { header: 'Izoh', key: 'notes', width: 48 },
      ];
      rows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: 'hududiy-hisobotlar.xlsx' };
    }
    const lines = [title, `Hisobotlar soni: ${rows.length}`, '', ...rows.map((row) => `${row.period} · ${row.mediator} · ${row.region} · ${row.status} · sessiyalar: ${row.sessions} · yakunlangan nizolar: ${row.resolved}${row.notes ? ` · ${row.notes}` : ''}`)];
    if (format === ReportExportFormat.DOCX) return { buffer: await this.createDocx(lines), contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'hududiy-hisobotlar.docx' };
    return { buffer: this.createPdf(lines), contentType: 'application/pdf', filename: 'hududiy-hisobotlar.pdf' };
  }

  private async createDocx(lines: string[]) {
    const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    zip.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style></w:styles>');
    const paragraphs = lines.map((line, index) => `<w:p><w:pPr>${index === 0 ? '<w:pStyle w:val="Title"/>' : ''}</w:pPr><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join('');
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  private createPdf(lines: string[]) {
    const printable = lines.flatMap((line) => {
      const value = ascii(line);
      if (!value) return [''];
      const chunks: string[] = [];
      for (let index = 0; index < value.length; index += 92) chunks.push(value.slice(index, index + 92));
      return chunks;
    });
    const pages = Array.from({ length: Math.max(1, Math.ceil(printable.length / 44)) }, (_, index) => printable.slice(index * 44, (index + 1) * 44));
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const pageIds: number[] = [];
    pages.forEach((pageLines) => {
      const pageId = objects.length + 1;
      const contentId = pageId + 1;
      pageIds.push(pageId);
      const content = ['BT', '/F1 11 Tf', '50 780 Td', ...pageLines.flatMap((line, index) => [`(${line.replace(/[()\\]/g, '\\$&')}) Tj`, ...(index < pageLines.length - 1 ? ['0 -16 Td'] : [])]), 'ET'].join('\n');
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
      objects.push(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`);
    });
    objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'ascii'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'ascii');
  }
}
