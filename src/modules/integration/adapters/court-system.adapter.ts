import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { CourtClaimDto } from '../dto/court-claim.dto';
import { CourtClaimStatus, IntegrationDirection, IntegrationStatus, Prisma } from '@prisma/client';

export interface ICourtSystemPort {
  receiveCourtClaim(claim: CourtClaimDto): Promise<any>;
  sendMediationResultToCourt(caseNumber: string, status: string, summary: string): Promise<any>;
}

@Injectable()
export class CourtSystemIntegrationAdapter implements ICourtSystemPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
  ) {}

  /**
   * Receive incoming claim forwarded by Court (POST /external/courts/claims)
   */
  async receiveCourtClaim(dto: CourtClaimDto) {
    const startTime = Date.now();
    try {
      const claim = await this.prisma.courtClaim.upsert({
        where: { courtCaseNumber: dto.courtCaseNumber },
        update: {
          courtName: dto.courtName,
          judgeName: dto.judgeName,
          claimantName: dto.claimantName,
          claimantPinfl: dto.claimantPinfl,
          claimantPhone: dto.claimantPhone,
          respondentName: dto.respondentName,
          respondentPinfl: dto.respondentPinfl,
          respondentPhone: dto.respondentPhone,
          disputeSubject: dto.disputeSubject,
          claimAmount: dto.claimAmount !== undefined ? new Prisma.Decimal(dto.claimAmount) : null,
          courtOrderDate: new Date(dto.courtOrderDate),
          documentUrl: dto.documentUrl,
        },
        create: {
          courtCaseNumber: dto.courtCaseNumber,
          courtName: dto.courtName,
          judgeName: dto.judgeName,
          claimantName: dto.claimantName,
          claimantPinfl: dto.claimantPinfl,
          claimantPhone: dto.claimantPhone,
          respondentName: dto.respondentName,
          respondentPinfl: dto.respondentPinfl,
          respondentPhone: dto.respondentPhone,
          disputeSubject: dto.disputeSubject,
          claimAmount: dto.claimAmount !== undefined ? new Prisma.Decimal(dto.claimAmount) : null,
          courtOrderDate: new Date(dto.courtOrderDate),
          documentUrl: dto.documentUrl,
          status: CourtClaimStatus.RECEIVED,
        },
      });

      await this.loggerService.log({
        serviceName: 'COURT_SYSTEM',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.SUCCESS,
        endpoint: '/external/courts/claims',
        request: dto,
        response: { claimId: claim.id, courtCaseNumber: claim.courtCaseNumber },
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Sud da\'vosi muvaffaqiyatli qabul qilindi va platformada ro\'yxatga olindi',
        claimId: claim.id,
        courtCaseNumber: claim.courtCaseNumber,
        status: claim.status,
      };
    } catch (err) {
      await this.loggerService.log({
        serviceName: 'COURT_SYSTEM',
        direction: IntegrationDirection.INBOUND,
        status: IntegrationStatus.FAILED,
        endpoint: '/external/courts/claims',
        request: dto,
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      throw new BadRequestException(`Sud da'vosini qabul qilishda xatolik: ${err.message}`);
    }
  }

  /**
   * Outgoing notify court system of mediation result
   */
  async sendMediationResultToCourt(caseNumber: string, status: string, summary: string) {
    return this.loggerService.executeWithResilience(
      async () => {
        return {
          acknowledged: true,
          caseNumber,
          courtReceiptId: `ACK_COURT_${Date.now()}`,
          receivedAt: new Date().toISOString(),
        };
      },
      {
        serviceName: 'COURT_SYSTEM',
        endpoint: '/api/v1/mediation/result-notification',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { caseNumber, status, summary },
    );
  }
}
