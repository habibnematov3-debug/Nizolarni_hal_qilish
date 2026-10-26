import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { CourtClaimDto } from '../dto/court-claim.dto';
import { CourtClaimStatus, IntegrationDirection, IntegrationStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../../notifications/services/notifications.service';

export interface ICourtSystemPort {
  receiveCourtClaim(claim: CourtClaimDto): Promise<any>;
  sendMediationResultToCourt(caseNumber: string, status: string, summary: string): Promise<any>;
}

@Injectable()
export class CourtSystemIntegrationAdapter implements ICourtSystemPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
    private readonly notifications: NotificationsService,
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
        request: { courtCaseNumber: dto.courtCaseNumber, claimantPinflLast4: dto.claimantPinfl?.slice(-4), respondentPinflLast4: dto.respondentPinfl?.slice(-4), documentProvided: Boolean(dto.documentUrl) },
        response: { claimId: claim.id, courtCaseNumber: claim.courtCaseNumber },
        durationMs: Date.now() - startTime,
      });

      const participantPinfls = [dto.claimantPinfl, dto.respondentPinfl].filter((value): value is string => Boolean(value));
      if (participantPinfls.length) {
        const participants = await this.prisma.user.findMany({ where: { pinfl: { in: participantPinfls }, status: 'ACTIVE' }, select: { id: true, pinfl: true } });
        await Promise.all(participants.map((participant) => this.notifications.send({
          userId: participant.id,
          templateCode: 'APPLICATION_STATUS',
          variables: {
            title: 'Sud da’vosi bo‘yicha mediatsiya',
            content: `Suddagi ${claim.courtCaseNumber} raqamli ish yuzasidan mediatsiya imkoniyati mavjud. Kabinetdagi “Sud da’volari” bo‘limidan ishni ko‘rib, mediatsiya murojaatini boshlashingiz mumkin.`,
          },
          idempotencyKey: `court-${claim.id}-${participant.id}-mediation-offer`,
          channels: ['CABINET', 'SMS'] as any,
        })));
      }

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
        request: { courtCaseNumber: dto.courtCaseNumber, claimantPinflLast4: dto.claimantPinfl?.slice(-4), respondentPinflLast4: dto.respondentPinfl?.slice(-4) },
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      throw new BadRequestException(`Sud da'vosini qabul qilishda xatolik: ${err.message}`);
    }
  }

  async getClaimsForParticipant(pinfl: string) {
    if (!/^\d{14}$/.test(pinfl)) return [];
    return this.prisma.courtClaim.findMany({
      where: { OR: [{ claimantPinfl: pinfl }, { respondentPinfl: pinfl }] },
      select: {
        id: true, courtCaseNumber: true, courtName: true, disputeSubject: true,
        courtOrderDate: true, status: true,
      },
      orderBy: { courtOrderDate: 'desc' },
    });
  }

  /**
   * Outgoing notify court system of mediation result
   */
  async sendMediationResultToCourt(caseNumber: string, status: string, summary: string) {
    const endpoint = process.env.COURT_RESULT_API_URL?.trim();
    return this.loggerService.executeWithResilience(
      async () => {
        if (!endpoint) throw new Error('COURT_RESULT_API_URL sozlanmagan; sud tizimiga yuborish amalga oshmadi');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.COURT_API_TOKEN ? { authorization: `Bearer ${process.env.COURT_API_TOKEN}` } : {}),
          },
          body: JSON.stringify({ caseNumber, status, summary }),
        });
        if (!response.ok) throw new Error(`Sud axborot tizimi ${response.status} javobini qaytardi`);
        const result = await response.json() as { acknowledged?: boolean; courtReceiptId?: string; receivedAt?: string };
        if (result.acknowledged !== true || !result.courtReceiptId) throw new Error('Sud tizimi mediatsiya natijasini tasdiqlamadi');
        return { acknowledged: true, caseNumber, courtReceiptId: result.courtReceiptId, receivedAt: result.receivedAt || new Date().toISOString() };
      },
      {
        serviceName: 'COURT_SYSTEM',
        endpoint: endpoint || '/api/v1/mediation/result-notification',
        timeoutMs: 4000,
        maxRetries: 2,
      },
      { caseNumber, status, summaryLength: summary.length },
    );
  }
}
