import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MyGovIntegrationAdapter } from '../adapters/mygov.adapter';
import { CourtSystemIntegrationAdapter } from '../adapters/court-system.adapter';
import { TrainingCenterIntegrationAdapter } from '../adapters/training-center.adapter';
import { BillingIntegrationAdapter } from '../adapters/billing.adapter';
import { LegalCapacityIntegrationAdapter } from '../adapters/legal-capacity.adapter';
import { VideoConferenceIntegrationAdapter } from '../adapters/video-conference.adapter';
import { PersonalizationIntegrationAdapter } from '../adapters/personalization.adapter';
import { MyGovMediatorsQueryDto } from '../dto/mygov-mediators-query.dto';
import { CourtClaimDto } from '../dto/court-claim.dto';
import { TrainingCertificateDto } from '../dto/training-certificate.dto';
import { BillingCallbackDto } from '../dto/billing-callback.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@ApiTags('Tashqi tizimlar integratsiyasi (ENT — Integratsiya adapterlari)')
@Controller('external')
export class ExternalIntegrationController {
  constructor(
    private readonly myGovAdapter: MyGovIntegrationAdapter,
    private readonly courtAdapter: CourtSystemIntegrationAdapter,
    private readonly trainingCenterAdapter: TrainingCenterIntegrationAdapter,
    private readonly billingAdapter: BillingIntegrationAdapter,
    private readonly legalCapacityAdapter: LegalCapacityIntegrationAdapter,
    private readonly videoAdapter: VideoConferenceIntegrationAdapter,
    private readonly personalizationAdapter: PersonalizationIntegrationAdapter,
    private readonly prisma: PrismaService,
  ) {}

  @Get('mygov/mediators')
  @ApiOperation({
    summary: 'my.gov.uz portali uchun reyestr ma\'lumotlari (ENT-03)',
    description: 'Yagona interaktiv davlat xizmatlari portali (my.gov.uz) uchun professional mediatorlar reyestri ma\'lumotlarini taqdim etish.',
  })
  @ApiResponse({ status: 200, description: 'Mediatorlar reyestri ro\'yxati' })
  async getMediatorsForMyGov(@Query() query: MyGovMediatorsQueryDto) {
    return this.myGovAdapter.getMediatorsRegistryForMyGov(query);
  }

  @Post('courts/claims')
  @ApiOperation({
    summary: 'Sudlar tizimidan yangi da\'vo hodisasini qabul qilish (ENT-08)',
    description: 'Sudlar tizimi tomonidan muqobil nizolarni hal qilish (mediatsiya)ga yo\'naltirilgan sud ishi va da\'vo tafsilotlarini qabul qilish.',
  })
  @ApiResponse({ status: 201, description: 'Sud da\'vosi muvaffaqiyatli qabul qilindi' })
  async receiveCourtClaim(@Body() dto: CourtClaimDto) {
    return this.courtAdapter.receiveCourtClaim(dto);
  }

  @Post('training-centers/certificates')
  @ApiOperation({
    summary: 'O\'quv markazi yoki TDYU tomonidan mediatorlik sertifikatini yuborish (ENT-09)',
    description: 'Yuristlar malakasini oshirish markazi (YUMOM) yoki TDYU tomonidan mediatorlik kursini tamomlagan tinglovchilar sertifikatlarini tizimga kiritish.',
  })
  @ApiResponse({ status: 201, description: 'Sertifikat muvaffaqiyatli qabul qilindi' })
  async receiveCertificate(@Body() dto: TrainingCertificateDto) {
    return this.trainingCenterAdapter.receiveCertificate(dto);
  }

  @Post('billing/callback')
  @ApiOperation({
    summary: 'Billing tizimidan to\'lov holati xabari (webhook) (ENT-04)',
    description: 'Davlat billing shlyuzi yoki to\'lov tizimlaridan to\'lov amalga oshirilganligi haqida xabarnomani qabul qilish va qayta ishlash.',
  })
  @ApiResponse({ status: 200, description: 'To\'lov holati qayta ishlandi' })
  async handleBillingCallback(@Body() dto: BillingCallbackDto) {
    return this.billingAdapter.handleCallback(dto);
  }
}

@ApiTags('Integratsiya jurnali va monitoring (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/integrations')
export class AdminIntegrationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalCapacityAdapter: LegalCapacityIntegrationAdapter,
    private readonly videoAdapter: VideoConferenceIntegrationAdapter,
    private readonly personalizationAdapter: PersonalizationIntegrationAdapter,
  ) {}

  @Get('logs')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tashqi tizimlar integratsiya jurnali (Loglar)',
    description: 'Barcha kiruvchi (INBOUND) va chiquvchi (OUTBOUND) adapter so\'rovlari tarixi, vaqt sarfi (ms) va xatoliklar auditi.',
  })
  @ApiResponse({ status: 200, description: 'Integratsiya loglari' })
  async getIntegrationLogs() {
    return this.prisma.integrationLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('claims')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Sudlardan qabul qilingan da\'volar ro\'yxati' })
  async getCourtClaims() {
    return this.prisma.courtClaim.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('certificates')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'O\'quv markazlaridan kelgan sertifikatlar ro\'yxati' })
  async getCertificates() {
    return this.prisma.trainingCertificate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('billing-transactions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Billing to\'lov tranzaksiyalari ro\'yxati' })
  async getBillingTransactions() {
    return this.prisma.billingTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('test/legal-capacity/:pinfl')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Sudlanganlik va muomala layoqatini tekshirish adapter testi (ENT-06)' })
  @ApiParam({ name: 'pinfl', example: '31201851230011' })
  async testLegalCapacity(@Param('pinfl') pinfl: string) {
    return this.legalCapacityAdapter.checkStatus(pinfl);
  }

  @Post('test/video-meeting')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Videokonferensiya xonasi yaratish adapter testi (ENT-07)' })
  async testVideoMeeting() {
    return this.videoAdapter.createMeeting('Test mediatsiya uchrashuvi', new Date().toISOString(), 60);
  }

  @Post('test/personalization/:pinfl')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Personallashtirish agentligi biometriya tekshiruvi adapter testi (ENT-10)' })
  @ApiParam({ name: 'pinfl', example: '31201851230044' })
  async testPersonalization(@Param('pinfl') pinfl: string) {
    return this.personalizationAdapter.verifyBiometrics(pinfl, 'AA7654321');
  }
}
