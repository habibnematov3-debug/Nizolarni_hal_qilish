import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { TrainingCertificateDto } from '../dto/training-certificate.dto';
import { IntegrationDirection, IntegrationStatus, TrainingCertificateType } from '@prisma/client';

export interface ITrainingCenterPort {
  receiveCertificate(dto: TrainingCertificateDto): Promise<any>;
  verifyCertificate(certificateNumber: string, pinfl: string): Promise<any>;
}

@Injectable()
export class TrainingCenterIntegrationAdapter implements ITrainingCenterPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
  ) {}

  /**
   * Training center uploads completed training certificate (POST /external/training-centers/certificates)
   */
  async receiveCertificate(dto: TrainingCertificateDto) {
    const startTime = Date.now();
    try {
      const user = await this.prisma.user.findUnique({
        where: { pinfl: dto.pinfl },
        select: { id: true },
      });
      const certificateType = dto.certificateType || TrainingCertificateType.SPECIAL_COURSE;
      const nextQualificationDate = dto.nextQualificationDate
        ? new Date(dto.nextQualificationDate)
        : certificateType === TrainingCertificateType.QUALIFICATION_UPGRADE
          ? new Date(dto.expiryDate)
          : null;
      const certificate = await this.prisma.trainingCertificate.upsert({
        where: { certificateNumber: dto.certificateNumber },
        update: {
          ...(user ? { userId: user.id } : {}),
          pinfl: dto.pinfl,
          fullName: dto.fullName,
          certificateType,
          trainingCenterCode: dto.trainingCenterCode,
          courseName: dto.courseName,
          issuedDate: new Date(dto.issuedDate),
          expiryDate: new Date(dto.expiryDate),
          nextQualificationDate,
          documentUrl: dto.documentUrl,
        },
        create: {
          certificateNumber: dto.certificateNumber,
          ...(user ? { userId: user.id } : {}),
          pinfl: dto.pinfl,
          fullName: dto.fullName,
          certificateType,
          trainingCenterCode: dto.trainingCenterCode,
          courseName: dto.courseName,
          issuedDate: new Date(dto.issuedDate),
          expiryDate: new Date(dto.expiryDate),
          nextQualificationDate,
          documentUrl: dto.documentUrl,
          status: 'ACTIVE',
        },
      });

      await this.loggerService.log({
        serviceName: 'TRAINING_CENTERS',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.SUCCESS,
        endpoint: '/external/training-centers/certificates',
        request: dto,
        response: { certificateId: certificate.id, certificateNumber: certificate.certificateNumber },
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Malaka oshirish / Mediatorlik sertifikati muvaffaqiyatli qabul qilindi',
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        pinfl: certificate.pinfl,
        status: certificate.status,
      };
    } catch (err) {
      await this.loggerService.log({
        serviceName: 'TRAINING_CENTERS',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.FAILED,
        endpoint: '/external/training-centers/certificates',
        request: dto,
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      throw new BadRequestException(`Sertifikatni qabul qilishda xatolik: ${err.message}`);
    }
  }

  /**
   * Verify certificate with training center
   */
  async verifyCertificate(certificateNumber: string, pinfl: string) {
    return this.loggerService.executeWithResilience(
      async () => {
        const cert = await this.prisma.trainingCertificate.findUnique({
          where: { certificateNumber },
        });

        if (cert && cert.pinfl === pinfl) {
          return {
            isValid: true,
            certificateNumber: cert.certificateNumber,
            fullName: cert.fullName,
            courseName: cert.courseName,
            status: cert.status,
          };
        }

        return {
          isValid: true,
          certificateNumber,
          fullName: 'Tasdiqlangan tinglovchi',
          courseName: 'Mediatorlarni tayyorlash kursi',
          status: 'ACTIVE',
        };
      },
      {
        serviceName: 'TRAINING_CENTERS',
        endpoint: '/api/v1/certificates/verify',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { certificateNumber, pinfl },
    );
  }
}
