import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  OrganizationType,
  Prisma,
  TrainingApplicationStatus,
  TrainingCertificateType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/services/notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingApplicationDto } from './dto/training-application.dto';
import { TrainingRegistryQueryDto } from './dto/training-registry-query.dto';

const CERTIFICATE_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      gender: true,
      birthDate: true,
      address: true,
      organization: { select: { region: true } },
    },
  },
} satisfies Prisma.TrainingCertificateInclude;

@Injectable()
export class OkmService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OkmService.name);
  private reminderInterval?: NodeJS.Timeout;
  private reminderStartupTimeout?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Vercel/serverless instances are short-lived; invoke the exposed sweep endpoint
    // from the platform scheduler there instead of relying on an in-process timer.
    if (process.env.VERCEL) return;
    this.reminderStartupTimeout = setTimeout(() => {
      void this.runQualificationReminders().catch((error) =>
        this.logger.error(`Malaka eslatmalari boshlang'ich tekshiruvi xatosi: ${error.message}`),
      );
    }, 60 * 1000);
    this.reminderStartupTimeout.unref?.();
    this.reminderInterval = setInterval(() => {
      void this.runQualificationReminders().catch((error) =>
        this.logger.error(`Malaka eslatmalari jadvali xatosi: ${error.message}`),
      );
    }, 24 * 60 * 60 * 1000);
    this.reminderInterval.unref?.();
  }

  onModuleDestroy() {
    if (this.reminderStartupTimeout) clearTimeout(this.reminderStartupTimeout);
    if (this.reminderInterval) clearInterval(this.reminderInterval);
  }

  async runQualificationReminders() {
    const timer = await this.prisma.timerSetting.findUnique({
      where: { key: 'QUALIFICATION_UPGRADE_ALERT_DAYS' },
    });
    const dayLimit = timer?.isActive ? Math.max(1, timer.durationValue) : 30;
    const now = new Date();
    const cutoff = new Date(now);
    if (timer?.durationUnit === 'MONTHS') cutoff.setMonth(cutoff.getMonth() + dayLimit);
    else if (timer?.durationUnit === 'HOURS') cutoff.setHours(cutoff.getHours() + dayLimit);
    else if (timer?.durationUnit === 'MINUTES') cutoff.setMinutes(cutoff.getMinutes() + dayLimit);
    else cutoff.setDate(cutoff.getDate() + dayLimit);

    const certificates = await this.prisma.trainingCertificate.findMany({
      where: {
        certificateType: TrainingCertificateType.QUALIFICATION_UPGRADE,
        status: 'ACTIVE',
        OR: [
          { nextQualificationDate: { gt: now, lte: cutoff } },
          { nextQualificationDate: null, expiryDate: { gt: now, lte: cutoff } },
        ],
      },
      include: { user: true },
    });

    let notified = 0;
    for (const certificate of certificates) {
      const user = certificate.user || await this.prisma.user.findUnique({
        where: { pinfl: certificate.pinfl },
      });
      if (!user || user.registryStatus !== 'MEDIATOR') continue;
      const dueDate = certificate.nextQualificationDate || certificate.expiryDate;
      try {
        const result = await this.notificationsService.send({
          userId: user.id,
          templateCode: 'QUALIFICATION_UPGRADE_REMINDER',
          variables: {
            certificateExpiryDate: dueDate.toLocaleDateString('uz-UZ'),
            dueDate: dueDate.toISOString(),
            certificateNumber: certificate.certificateNumber,
          },
          idempotencyKey: `okm_qualification_${certificate.id}_${dueDate.toISOString().slice(0, 10)}`,
        });
        if (!(result as { idempotent?: boolean })?.idempotent) notified++;
      } catch (error) {
        this.logger.error(`Malaka eslatmasini yuborib bo'lmadi (${certificate.id}): ${error.message}`);
      }
    }

    return { examined: certificates.length, notified };
  }

  async getCertifiedRegistry(query: TrainingRegistryQueryDto) {
    return this.getCertificateRegistry(TrainingCertificateType.SPECIAL_COURSE, query);
  }

  async getQualifiedRegistry(query: TrainingRegistryQueryDto) {
    return this.getCertificateRegistry(TrainingCertificateType.QUALIFICATION_UPGRADE, query);
  }

  private async getCertificateRegistry(
    certificateType: TrainingCertificateType,
    query: TrainingRegistryQueryDto,
  ) {
    const { page = 1, limit = 10, search, region, gender } = query;
    const filters: Prisma.TrainingCertificateWhereInput[] = [];
    if (region) {
      filters.push({ user: { organization: { region: { contains: region, mode: 'insensitive' } } } });
    }
    if (gender) {
      filters.push({ user: { gender: { equals: gender, mode: 'insensitive' } } });
    }
    const where: Prisma.TrainingCertificateWhereInput = {
      certificateType,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { pinfl: { contains: search } },
              { certificateNumber: { contains: search, mode: 'insensitive' } },
              { courseName: { contains: search, mode: 'insensitive' } },
              { trainingCenterCode: { contains: search, mode: 'insensitive' } },
              { user: { phone: { contains: search } } },
              { user: { address: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(filters.length ? { AND: filters } : {}),
    };

    const [total, certificates] = await Promise.all([
      this.prisma.trainingCertificate.count({ where }),
      this.prisma.trainingCertificate.findMany({
        where,
        include: CERTIFICATE_INCLUDE,
        orderBy: [{ issuedDate: 'desc' }, { fullName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const trainingCenterNames = await this.getTrainingCenterNames(
      certificates.map((certificate) => certificate.trainingCenterCode),
    );

    return {
      items: certificates.map((certificate) => this.toRegistryItem(certificate, trainingCenterNames)),
      pagination: this.pagination(total, page, limit),
    };
  }

  async getOverdueRegistry(query: TrainingRegistryQueryDto) {
    const users = await this.prisma.user.findMany({
      where: { registryStatus: 'MEDIATOR' },
      include: {
        organization: { select: { region: true } },
        trainingCertificates: {
          where: {
            certificateType: TrainingCertificateType.QUALIFICATION_UPGRADE,
          },
          orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    const today = new Date();
    const search = query.search?.trim().toLocaleLowerCase();
    const region = query.region?.trim().toLocaleLowerCase();
    const gender = query.gender?.trim().toLocaleLowerCase();
    const overdue = users
      .map((user) => ({ user, certificate: user.trainingCertificates[0] || null }))
      .filter(({ user, certificate }) => {
        const dueDate = certificate?.nextQualificationDate || certificate?.expiryDate;
        if (certificate?.status === 'ACTIVE' && dueDate && dueDate > today) return false;
        if (region && !user.organization?.region?.toLocaleLowerCase().includes(region)) return false;
        if (gender && user.gender?.toLocaleLowerCase() !== gender) return false;
        if (
          search &&
          ![user.fullName, user.pinfl, user.phone, user.address]
            .filter(Boolean)
            .some((value) => value.toLocaleLowerCase().includes(search))
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));

    const { page = 1, limit = 10 } = query;
    const trainingCenterNames = await this.getTrainingCenterNames(
      overdue.slice((page - 1) * limit, page * limit)
        .map(({ certificate }) => certificate?.trainingCenterCode)
        .filter(Boolean),
    );
    const items = overdue
      .slice((page - 1) * limit, page * limit)
      .map(({ user, certificate }) => ({
        userId: user.id,
        fullName: user.fullName,
        pinfl: user.pinfl,
        region: user.organization?.region || null,
        gender: user.gender,
        age: this.age(user.birthDate),
        address: user.address,
        phone: user.phone,
        lastQualificationDate: certificate?.issuedDate || null,
        nextQualificationDate:
          certificate?.nextQualificationDate || certificate?.expiryDate || null,
        trainingCenterName: certificate
          ? trainingCenterNames.get(certificate.trainingCenterCode) || certificate.trainingCenterCode
          : null,
        certificate: certificate ? this.certificateSummary(certificate) : null,
        overdue: true,
      }));

    return { items, pagination: this.pagination(overdue.length, page, limit) };
  }

  async getMyCertificates(user: AuthUser, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const where: Prisma.TrainingCertificateWhereInput = {
      OR: [{ userId: user.id }, ...(user.pinfl ? [{ pinfl: user.pinfl }] : [])],
    };
    const [total, certificates] = await Promise.all([
      this.prisma.trainingCertificate.count({ where }),
      this.prisma.trainingCertificate.findMany({
        where,
        include: CERTIFICATE_INCLUDE,
        orderBy: { issuedDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const trainingCenterNames = await this.getTrainingCenterNames(
      certificates.map((certificate) => certificate.trainingCenterCode),
    );

    return {
      items: certificates.map((certificate) => this.toRegistryItem(certificate, trainingCenterNames)),
      pagination: this.pagination(total, page, limit),
    };
  }

  async getCertificateFileUrl(id: string, user: AuthUser) {
    const certificate = await this.prisma.trainingCertificate.findUnique({ where: { id } });
    if (!certificate) throw new NotFoundException('Sertifikat topilmadi');

    const isStaff = user.roles.some((role) =>
      ['ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF'].includes(role),
    );
    if (!isStaff && certificate.userId !== user.id && certificate.pinfl !== user.pinfl) {
      throw new ForbiddenException('Ushbu sertifikatni ko\'rishga ruxsat yo\'q');
    }
    if (!certificate.documentUrl) throw new NotFoundException('Sertifikat fayli biriktirilmagan');

    let fileUrl: URL;
    try {
      fileUrl = new URL(certificate.documentUrl);
    } catch {
      throw new NotFoundException('Sertifikat fayli manzili yaroqsiz');
    }
    if (fileUrl.protocol !== 'https:') {
      throw new NotFoundException('Sertifikat fayli xavfsiz manzilda mavjud emas');
    }
    return { certificateId: certificate.id, certificateNumber: certificate.certificateNumber, fileUrl: fileUrl.toString() };
  }

  async createApplication(user: AuthUser, dto: TrainingApplicationDto) {
    const center = await this.prisma.organization.findFirst({
      where: {
        type: OrganizationType.TRAINING_CENTER,
        status: 'ACTIVE',
        code: { equals: dto.trainingCenterCode, mode: 'insensitive' },
      },
      select: { code: true },
    });
    if (!center) throw new BadRequestException('Faol o\'quv markazi topilmadi');

    return this.prisma.trainingApplication.create({
      data: {
        userId: user.id,
        trainingCenterCode: center.code,
        courseName: dto.courseName.trim(),
        note: dto.note?.trim() || null,
      },
      include: { contract: true },
    });
  }

  async getMyApplications(user: AuthUser, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const [total, items] = await Promise.all([
      this.prisma.trainingApplication.count({ where: { userId: user.id } }),
      this.prisma.trainingApplication.findMany({
        where: { userId: user.id },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, pagination: this.pagination(total, page, limit) };
  }

  async createContract(applicationId: string, user: AuthUser) {
    const application = await this.prisma.trainingApplication.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { contract: true },
    });
    if (!application) throw new NotFoundException('Malaka oshirish arizasi topilmadi');
    if (application.contract) return application.contract;

    const center = await this.prisma.organization.findFirst({
      where: {
        type: OrganizationType.TRAINING_CENTER,
        code: application.trainingCenterCode,
        status: 'ACTIVE',
      },
      select: { code: true, name: true },
    });
    if (!center) throw new BadRequestException('O\'quv markazi faol emas yoki topilmadi');

    const contract = await this.prisma.$transaction(async (tx) => {
      const contractNumber = `OKM-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const created = await tx.trainingContract.upsert({
        where: { applicationId: application.id },
        update: {},
        create: {
          applicationId: application.id,
          contractNumber,
          trainingCenterCode: center.code,
          trainingCenterName: center.name,
          mediatorName: user.fullName,
          mediatorPinfl: user.pinfl || '',
          courseName: application.courseName,
        },
      });
      await tx.trainingApplication.update({
        where: { id: application.id },
        data: { status: TrainingApplicationStatus.CONTRACT_CREATED },
      });
      return created;
    });
    return contract;
  }

  private async getTrainingCenterNames(codes: Array<string | null | undefined>) {
    const uniqueCodes = [...new Set(codes.filter(Boolean))] as string[];
    const centers = uniqueCodes.length
      ? await this.prisma.organization.findMany({
          where: { code: { in: uniqueCodes } },
          select: { code: true, name: true },
        })
      : [];
    return new Map(centers.map((center) => [center.code, center.name]));
  }

  private toRegistryItem(certificate: any, trainingCenterNames: Map<string, string>) {
    const user = certificate.user;
    return {
      id: certificate.id,
      userId: user?.id || certificate.userId,
      fullName: user?.fullName || certificate.fullName,
      pinfl: certificate.pinfl,
      region: user?.organization?.region || null,
      gender: user?.gender || null,
      age: this.age(user?.birthDate),
      address: user?.address || null,
      phone: user?.phone || null,
      certificateType: certificate.certificateType,
      courseName: certificate.courseName,
      issuedDate: certificate.issuedDate,
      nextQualificationDate: certificate.nextQualificationDate,
      trainingCenterCode: certificate.trainingCenterCode,
      trainingCenterName:
        trainingCenterNames.get(certificate.trainingCenterCode) || certificate.trainingCenterCode,
      certificate: this.certificateSummary(certificate),
    };
  }

  private certificateSummary(certificate: any) {
    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType,
      trainingCenterCode: certificate.trainingCenterCode,
      courseName: certificate.courseName,
      issuedDate: certificate.issuedDate,
      expiryDate: certificate.expiryDate,
      nextQualificationDate: certificate.nextQualificationDate,
      status: certificate.status,
      fileAvailable: Boolean(certificate.documentUrl),
    };
  }

  private age(birthDate?: string | null) {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    if (
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
    ) {
      age--;
    }
    return age;
  }

  private pagination(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
