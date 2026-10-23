import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntService } from './int.service';
import { AddDisciplineDocumentDto, CreateDecisionDto, CreateDisciplineCaseDto, QueryDisciplineCasesDto } from './dto/int.dto';

@ApiTags('Intizomiy javobgarlik va mediator dosyesi (INT)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff/int')
@Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF')
export class IntController {
  constructor(private readonly service: IntService) {}

  @Get('disciplinary-cases') @ApiOperation({ summary: 'Intizomiy ishlar ro\'yxati va filtr' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryDisciplineCasesDto) { return this.service.listCases(user, query); }

  @Post('disciplinary-cases') @Roles('COMMISSION', 'REGIONAL_STAFF', 'MINISTRY_STAFF') @ApiOperation({ summary: 'Intizomiy ish ochish' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDisciplineCaseDto, @Req() req: any) { return this.service.createCase(user, dto, req.ip); }

  @Get('disciplinary-cases/:id') @ApiOperation({ summary: 'Intizomiy ish tafsiloti' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.getCase(user, id); }

  @Post('disciplinary-cases/:id/documents') @ApiOperation({ summary: 'Intizomiy ishga hujjat biriktirish' })
  document(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddDisciplineDocumentDto) { return this.service.addDocument(user, id, dto); }

  @Post('disciplinary-cases/:id/decision') @ApiOperation({ summary: 'Intizomiy qarorni rasmiylashtirish' })
  decision(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateDecisionDto, @Req() req: any) { return this.service.createDecision(user, id, dto, req.ip); }

  @Get('mediators/:mediatorId/dossier') @ApiOperation({ summary: 'Mediator dosyesi' })
  dossier(@CurrentUser() user: AuthUser, @Param('mediatorId') mediatorId: string) { return this.service.getDossier(user, mediatorId); }
}
