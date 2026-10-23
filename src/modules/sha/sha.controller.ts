import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractType } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ContractDecisionDto,
  ContractQueryDto,
  CreateContractDto,
  CreateContractTemplateDto,
  CreateInvoiceDto,
  MediatorBankDetailsDto,
  SignContractDto,
  UpdateContractDto,
  UpdateContractTemplateDto,
} from './dto/sha.dto';
import { ShaService } from './sha.service';

const CONTRACT_ROLES = ['TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'ADMIN'];

@ApiTags('SHA — Shartnomalar va invoyslar')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ShaController {
  constructor(private readonly sha: ShaService) {}

  @Get('contracts/statistics')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Shartnomalar soni va holatlar bo‘yicha statistika' })
  statistics(@CurrentUser() user: AuthUser) { return this.sha.statistics(user); }

  @Get('contracts')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Taraf bo‘lgan shartnomalar ro‘yxati, holat va qidiruv filtrlari' })
  list(@CurrentUser() user: AuthUser, @Query() query: ContractQueryDto) { return this.sha.listContracts(user, query); }

  @Post('contracts')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Namunadan yangi shartnoma qoralamasini yaratish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractDto, @Req() request: Request) {
    return this.sha.createContract(user, dto, request.ip);
  }

  @Get('contracts/:id')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Shartnoma tafsilotlari va taraflar' })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.sha.getContract(user, id); }

  @Put('contracts/:id')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Qoralama yoki tahrirga qaytarilgan shartnomani tahrirlash' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto, @Req() request: Request) {
    return this.sha.updateContract(user, id, dto, request.ip);
  }

  @Post('contracts/:id/invoice')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'ADMIN')
  @ApiOperation({ summary: 'Shartnoma loyihasi uchun invoys yaratib yuborish' })
  invoice(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInvoiceDto, @Req() request: Request) {
    return this.sha.createInvoice(user, id, dto, request.ip);
  }

  @Post('contracts/:id/send')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR', 'ADMIN')
  @ApiOperation({ summary: 'Invoys bilan birga shartnoma loyihasini taraflarga yuborish' })
  send(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() request: Request) {
    return this.sha.sendContract(user, id, request.ip);
  }

  @Post('contracts/:id/sign')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Taraf shartnomani E-imzo PKCS#7 bilan tasdiqlashi' })
  sign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SignContractDto, @Req() request: Request) {
    return this.sha.signContract(user, id, dto.pkcs7, request.ip);
  }

  @Post('contracts/:id/reject')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Shartnomani sabab bilan rad etish' })
  reject(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ContractDecisionDto, @Req() request: Request) {
    return this.sha.rejectContract(user, id, dto, request.ip);
  }

  @Post('contracts/:id/return-for-edit')
  @Roles('TALABGOR', 'MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Tahrir kiritish uchun shartnomani qaytarish' })
  returnForEdit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ContractDecisionDto, @Req() request: Request) {
    return this.sha.returnForEdit(user, id, dto, request.ip);
  }

  @Post('contracts/:id/approve')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Xizmat ko‘rsatuvchining yakuniy E-imzo tasdig‘i' })
  approve(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SignContractDto, @Req() request: Request) {
    return this.sha.approveContract(user, id, dto.pkcs7, request.ip);
  }

  @Get('contracts/:id/document')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Shartnoma PDF nusxasi; imzolangan hujjat o‘zgarmas holda qaytariladi' })
  async document(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const buffer = await this.sha.getContractPdf(user, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="contract-${id}.pdf"`);
    return response.send(buffer);
  }

  @Get('contracts/:id/signatures')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Imzolar, tekshiruv natijalari va sanalari' })
  signatures(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.sha.getSignatures(user, id); }

  @Get('invoices/:id/receipt')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Tasdiqlangan to‘lov uchun PDF kvitansiya' })
  async receipt(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Res() response: Response) {
    const buffer = await this.sha.getReceiptPdf(user, id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="receipt-${id}.pdf"`);
    return response.send(buffer);
  }

  @Get('invoices/:id')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Invoys va billing to‘lov holati' })
  invoiceDetail(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.sha.getInvoice(user, id); }

  @Get('cabinet/bank-details')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Xizmat ko‘rsatuvchi kabineti bank rekvizitlari' })
  bankDetails(@CurrentUser() user: AuthUser) { return this.sha.getBankDetails(user); }

  @Put('cabinet/bank-details')
  @Roles('MEDIATOR', 'ARBITRATION_JUDGE', 'ARBITRATOR')
  @ApiOperation({ summary: 'Bank hisob raqami ma’lumotlarini saqlash' })
  updateBankDetails(@CurrentUser() user: AuthUser, @Body() dto: MediatorBankDetailsDto, @Req() request: Request) {
    return this.sha.updateBankDetails(user, dto, request.ip);
  }

  @Get('contract-templates')
  @Roles(...CONTRACT_ROLES)
  @ApiOperation({ summary: 'Foydalanish uchun chop etilgan shartnoma namunalari' })
  templates(@Query('type') type?: ContractType) { return this.sha.listPublicTemplates(type); }
}

@ApiTags('SHA — Shartnoma namunalari (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/contract-templates')
export class AdminContractTemplatesController {
  constructor(private readonly sha: ShaService) {}

  @Get()
  @ApiOperation({ summary: 'Barcha namuna versiyalarini boshqarish' })
  list() { return this.sha.listTemplates(); }

  @Post()
  @ApiOperation({ summary: 'Yangi versiyali shartnoma namunasini yaratish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateContractTemplateDto, @Req() request: Request) {
    return this.sha.createTemplate(user, dto, request.ip);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Qoralama namunani tahrirlash yoki nashr/arxiv holatiga o‘tkazish' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractTemplateDto, @Req() request: Request) {
    return this.sha.updateTemplate(user, id, dto, request.ip);
  }
}
