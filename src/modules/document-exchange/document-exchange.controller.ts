import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateDocumentExchangeMessageDto,
  CreateInteragencyExchangeDto,
  DocumentExchangeActionDto,
  DocumentExchangeQueryDto,
} from './dto/document-exchange.dto';
import { DocumentExchangeService } from './document-exchange.service';

@ApiTags('Hujjat almashinuvi')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinet/document-exchange')
export class DocumentExchangeController {
  constructor(private readonly service: DocumentExchangeService) {}

  @Get()
  @Roles('TALABGOR', 'MEDIATOR', 'REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Ish hujjatlari yoki idoralararo kiruvchi/chiquvchi hujjatlar' })
  list(@CurrentUser() user: AuthUser, @Query() query: DocumentExchangeQueryDto) {
    return this.service.list(user, query);
  }

  @Post('interagency')
  @Roles('MEDIATOR')
  @ApiOperation({ summary: 'Mediator hududiy adliya organiga hujjat yuboradi' })
  createInteragency(@CurrentUser() user: AuthUser, @Body() dto: CreateInteragencyExchangeDto, @Req() req: Request) {
    return this.service.createInteragency(user, dto, req.ip || req.socket.remoteAddress);
  }

  @Get('mediations/:mediationId')
  @Roles('TALABGOR', 'MEDIATOR')
  @ApiOperation({ summary: 'Mediatsiya ishidagi hujjatlar va yozishmalar' })
  mediationThread(@CurrentUser() user: AuthUser, @Param('mediationId') mediationId: string) {
    return this.service.getMediationThread(user, mediationId);
  }

  @Post('mediations/:mediationId/messages')
  @Roles('TALABGOR', 'MEDIATOR')
  @ApiOperation({ summary: 'Mediatsiya ishiga xabar yoki hujjat yuborish' })
  sendMediationMessage(
    @CurrentUser() user: AuthUser,
    @Param('mediationId') mediationId: string,
    @Body() dto: CreateDocumentExchangeMessageDto,
    @Req() req: Request,
  ) {
    return this.service.sendMediationMessage(user, mediationId, dto, req.ip || req.socket.remoteAddress);
  }

  @Get(':id')
  @Roles('TALABGOR', 'MEDIATOR', 'REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hujjat almashinuvi tafsilotlari' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getThread(user, id);
  }

  @Post(':id/messages')
  @Roles('TALABGOR', 'MEDIATOR', 'REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hujjat oqimiga xabar yoki fayl qo‘shish' })
  sendMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateDocumentExchangeMessageDto, @Req() req: Request) {
    return this.service.sendMessage(user, id, dto, req.ip || req.socket.remoteAddress);
  }

  @Post(':id/actions')
  @Roles('REGIONAL_STAFF', 'MINISTRY_STAFF')
  @ApiOperation({ summary: 'Hujjatni qabul qilish, tuzatishga qaytarish, vazirlikka yuborish yoki yakunlash' })
  act(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DocumentExchangeActionDto, @Req() req: Request) {
    return this.service.act(user, id, dto, req.ip || req.socket.remoteAddress);
  }
}
