import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CabinetType, DisciplineSanctionType, DisciplineStatus, MediatorRegistryStatus, Prisma, RegistryStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/services/notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AddDisciplineDocumentDto, CreateDecisionDto, CreateDisciplineCaseDto, QueryDisciplineCasesDto } from './dto/int.dto';

@Injectable()
export class IntService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly notifications: NotificationsService) {}

  private isMinistryOrAdmin(user: AuthUser) { return user.roles.includes('MINISTRY_STAFF') || user.roles.includes('ADMIN'); }

  private async assertMediatorScope(user: AuthUser, mediator: { organization?: { region: string | null } | null }) {
    if (!this.isMinistryOrAdmin(user) && user.roles.includes('REGIONAL_STAFF') && user.region && mediator.organization?.region !== user.region) {
      throw new ForbiddenException('Mediator boshqa hududga tegishli');
    }
  }

  async listCases(user: AuthUser, query: QueryDisciplineCasesDto) {
    const where: Prisma.DisciplineCaseWhereInput = {};
    if (query.status && Object.values(DisciplineStatus).includes(query.status as DisciplineStatus)) where.status = query.status as DisciplineStatus;
    if (query.sanctionType) where.decision = { sanctionType: query.sanctionType as DisciplineSanctionType };
    const mediatorFilter: Prisma.UserWhereInput = {};
    if (query.fullName || query.gender || query.region || query.registeredYear) {
      Object.assign(mediatorFilter, {
        ...(query.fullName ? { fullName: { contains: query.fullName, mode: 'insensitive' } } : {}),
        ...(query.gender ? { gender: query.gender } : {}),
        ...(query.region ? { organization: { region: query.region } } : {}),
        ...(query.registeredYear ? { dossier: { registeredYear: query.registeredYear } } : {}),
      });
    }
    if (user.roles.includes('REGIONAL_STAFF') && user.region) mediatorFilter.organization = { region: user.region };
    if (Object.keys(mediatorFilter).length) where.mediator = { is: mediatorFilter };
    const cases = await this.prisma.disciplineCase.findMany({ where, include: { mediator: { include: { organization: true, dossier: true } }, decision: true }, orderBy: { updatedAt: 'desc' } });
    if (query.age) return cases.filter((item) => this.age(item.mediator.birthDate) === query.age);
    return cases;
  }

  private age(birthDate?: string | null) {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    return now.getUTCFullYear() - birth.getUTCFullYear() - ((now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) ? 1 : 0);
  }

  async createCase(user: AuthUser, dto: CreateDisciplineCaseDto, ipAddress?: string) {
    const mediator = await this.prisma.user.findUnique({ where: { id: dto.mediatorId }, include: { organization: true } });
    if (!mediator) throw new NotFoundException('Mediator topilmadi');
    await this.assertMediatorScope(user, mediator);
    const item = await this.prisma.disciplineCase.create({ data: { caseNumber: `INT-${new Date().getFullYear()}-${Date.now()}`, mediatorId: dto.mediatorId, description: dto.description, createdById: user.id } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_DISCIPLINE_CASE', entityType: 'INT_DISCIPLINE_CASE', entityId: item.id, newValues: dto, ipAddress });
    return item;
  }

  async getCase(user: AuthUser, id: string) {
    const item = await this.prisma.disciplineCase.findUnique({ where: { id }, include: { mediator: { include: { organization: true, dossier: true } }, documents: true, decision: true, createdBy: true } });
    if (!item) throw new NotFoundException('Intizomiy ish topilmadi');
    await this.assertMediatorScope(user, item.mediator);
    return item;
  }

  async addDocument(user: AuthUser, id: string, dto: AddDisciplineDocumentDto) {
    const item = await this.getCase(user, id);
    return this.prisma.disciplineDocument.create({ data: { caseId: item.id, fileName: dto.fileName, fileUrl: dto.fileUrl, fileSize: dto.fileSize, mimeType: dto.mimeType, uploadedById: user.id } });
  }

  async createDecision(user: AuthUser, id: string, dto: CreateDecisionDto, ipAddress?: string) {
    const item = await this.getCase(user, id);
    const existing = await this.prisma.disciplineDecision.findUnique({ where: { caseId: id } });
    if (existing) throw new ConflictException('Bu ish bo\'yicha qaror allaqachon mavjud');
    const decision = await this.prisma.$transaction(async (tx) => {
      const created = await tx.disciplineDecision.create({ data: { caseId: id, sanctionType: dto.sanctionType, decisionDate: new Date(), effectiveFrom: new Date(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null, commissionNotes: dto.commissionNotes } });
      await tx.disciplineCase.update({ where: { id }, data: { status: DisciplineStatus.SANCTIONED, closedAt: new Date() } });
      return created;
    });
    let registryUpdated = false;
    if (dto.sanctionType === DisciplineSanctionType.SUSPENSION || dto.sanctionType === DisciplineSanctionType.REVOCATION) {
      const nextStatus = dto.sanctionType === DisciplineSanctionType.SUSPENSION ? MediatorRegistryStatus.SUSPENDED : MediatorRegistryStatus.REVOKED;
      await this.prisma.mediatorDossier.upsert({ where: { mediatorId: item.mediatorId }, create: { mediatorId: item.mediatorId, registeredYear: new Date().getFullYear(), region: item.mediator.organization?.region || '', specialization: [], registryStatus: nextStatus }, update: { registryStatus: nextStatus } });
      if (dto.sanctionType === DisciplineSanctionType.REVOCATION) await this.prisma.user.update({ where: { id: item.mediatorId }, data: { registryStatus: RegistryStatus.NONE, cabinetType: CabinetType.APPLICANT } });
      registryUpdated = true;
    }
    const updated = await this.prisma.disciplineDecision.update({ where: { id: decision.id }, data: { registryUpdated, notificationSent: true } });
    await this.audit.log({ userId: user.id, username: user.username, userFullName: user.fullName, action: 'CREATE_DISCIPLINE_DECISION', entityType: 'INT_DISCIPLINE_DECISION', entityId: decision.id, newValues: dto, ipAddress });
    await this.notifications.send({ userId: item.mediatorId, templateCode: 'APPLICATION_STATUS', variables: { title: 'Intizomiy qaror', content: `Sizga ${dto.sanctionType} jazosi tayinlandi.` }, idempotencyKey: `int-decision-${decision.id}`, channels: ['CABINET', 'SMS'] as any });
    return updated;
  }

  async getDossier(user: AuthUser, mediatorId: string) {
    const mediator = await this.prisma.user.findUnique({ where: { id: mediatorId }, include: { organization: true, dossier: true, disciplineCasesAsMediator: { include: { decision: true, documents: true }, orderBy: { createdAt: 'desc' } } } });
    if (!mediator) throw new NotFoundException('Mediator topilmadi');
    await this.assertMediatorScope(user, mediator);
    return mediator;
  }
}
