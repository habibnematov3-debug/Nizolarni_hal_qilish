import {
  Controller,
  Body,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TrainingApplicationDto } from './dto/training-application.dto';
import { TrainingRegistryQueryDto } from './dto/training-registry-query.dto';
import { OkmService } from './okm.service';

@ApiTags('OKM — O\'quv markazlari va malaka oshirish')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OkmController {
  constructor(private readonly okmService: OkmService) {}

  @Get('staff/training/certified')
  @Roles('ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF')
  @ApiOperation({ summary: 'Maxsus o\'quv kursini tugatganlar reyestri (OKM-01)' })
  @ApiResponse({ status: 200, description: 'Sertifikat va tinglovchi ma\'lumotlari sahifalangan ro\'yxati' })
  getCertifiedRegistry(@Query() query: TrainingRegistryQueryDto, @CurrentUser() user: AuthUser) {
    return this.okmService.getCertifiedRegistry(this.scopeRegistryQuery(query, user));
  }

  @Get('staff/training/qualified')
  @Roles('ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF')
  @ApiOperation({ summary: 'Malaka oshirgan mediatorlar reyestri (OKM-02)' })
  @ApiResponse({ status: 200, description: 'Malaka sertifikatlari va keyingi muddatlar ro\'yxati' })
  getQualifiedRegistry(@Query() query: TrainingRegistryQueryDto, @CurrentUser() user: AuthUser) {
    return this.okmService.getQualifiedRegistry(this.scopeRegistryQuery(query, user));
  }

  @Get('staff/training/overdue')
  @Roles('ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF')
  @ApiOperation({ summary: 'Malaka oshirish muddati o\'tgan mediatorlar (OKM-03)' })
  @ApiResponse({ status: 200, description: 'Malaka muddatidan o\'tgan yoki malaka sertifikati mavjud bo\'lmagan mediatorlar' })
  getOverdueRegistry(@Query() query: TrainingRegistryQueryDto, @CurrentUser() user: AuthUser) {
    return this.okmService.getOverdueRegistry(this.scopeRegistryQuery(query, user));
  }

  @Post('admin/training/reminders/run')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Malaka oshirish eslatmalari taymerini ishga tushirish',
    description: 'Mahalliy scheduler tomonidan kunlik ishlatiladi; serverless muhitda tashqi scheduler shu endpointni chaqiradi.',
  })
  @ApiResponse({ status: 200, description: 'Eslatmalar tekshirildi va jo\'natildi' })
  runQualificationReminders() {
    return this.okmService.runQualificationReminders();
  }

  @Get('cabinet/certificates')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Mening sertifikatlarim' })
  getMyCertificates(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.okmService.getMyCertificates(user, query);
  }

  @Get('certificates/:id/file')
  @Roles('ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Sertifikat fayli manzilini olish' })
  @ApiParam({ name: 'id', description: 'Sertifikat UUID' })
  @ApiResponse({ status: 200, description: 'HTTPS sertifikat fayli manzili' })
  async getCertificateFile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const { fileUrl } = await this.okmService.getCertificateFileUrl(id, user);
    return response.redirect(302, fileUrl);
  }

  @Post('cabinet/training/applications')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Malaka oshirish uchun ariza yuborish (OKM-04)' })
  @ApiResponse({ status: 201, description: 'Ariza qabul qilindi' })
  createApplication(
    @CurrentUser() user: AuthUser,
    @Body() dto: TrainingApplicationDto,
  ) {
    return this.okmService.createApplication(user, dto);
  }

  @Post('cabinet/training/applications/:id/contract')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'O\'quv markazi bilan shartnoma yaratish (OKM-04)' })
  @ApiParam({ name: 'id', description: 'Ariza UUID' })
  @ApiResponse({ status: 201, description: 'Shartnoma yaratildi' })
  createContract(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.okmService.createContract(id, user);
  }

  @Get('cabinet/training/applications')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Mening malaka oshirish arizalarim' })
  getMyApplications(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.okmService.getMyApplications(user, query);
  }

  private scopeRegistryQuery(query: TrainingRegistryQueryDto, user: AuthUser) {
    if (user.roles.includes('ADMIN')) return query;
    if (!user.roles.includes('REGIONAL_STAFF')) return query;
    return { ...query, region: user.region || '__NO_REGION__' };
  }
}
