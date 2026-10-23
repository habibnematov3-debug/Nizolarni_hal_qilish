import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRegistryEntryDto, UpdateRegistryEntryDto, UpdateRegistryStatusDto } from './dto/registry-entry.dto';
import { PublicRegistryQueryDto, RegistryQueryDto } from './dto/registry-query.dto';
import { RegistryService } from './registry.service';

@ApiTags('REG — Ochiq mediatorlar reyestri')
@Controller('public/mediators')
export class PublicRegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Get()
  @ApiOperation({ summary: 'Ochiq reyestrdan mediator, sudya yoki arbitr qidirish (REG-04)' })
  @ApiResponse({ status: 200, description: 'Ochiq ma\'lumotlar va sahifalangan natijalar' })
  search(@Query() query: PublicRegistryQueryDto) {
    return this.registry.listPublic(query);
  }

  @Get('map')
  @ApiOperation({ summary: 'Xarita uchun ochiq mediatorlar koordinatalari (REG-08)' })
  map(@Query() query: PublicRegistryQueryDto) {
    return this.registry.getMapPoints(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Reyestr yozuvining ochiq profili' })
  getProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.registry.getPublicProfile(id);
  }
}

@ApiTags('REG — Ichki reyestr')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MINISTRY_STAFF', 'REGIONAL_STAFF')
@Controller('staff/registry')
export class StaffRegistryController {
  constructor(private readonly registry: RegistryService) {}

  @Get('mediators')
  @ApiOperation({ summary: 'Reyestr jurnali va kengaytirilgan filtr (REG-05, REG-06)' })
  list(@Query() query: RegistryQueryDto, @CurrentUser() user: AuthUser) {
    return this.registry.listStaff(query, user);
  }

  @Post('mediators')
  @ApiOperation({ summary: 'Reyestrga yozuv kiritish' })
  @ApiResponse({ status: 201, description: 'Reyestr yozuvi yaratildi' })
  create(
    @Body() dto: CreateRegistryEntryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.registry.createEntry(dto, user, req.ip);
  }

  @Get('mediators/:id')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Ichki reyestr yozuvi va obyektivka' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.registry.getStaffEntry(id, user);
  }

  @Patch('mediators/:id')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Reyestr ma\'lumotlarini tahrirlash' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegistryEntryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.registry.updateEntry(id, dto, user, req.ip);
  }

  @Delete('mediators/:id')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Reyestrdan yozuvni chiqarish; audit va tarix saqlanadi' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.registry.deleteEntry(id, user, req.ip);
  }

  @Patch('mediators/:id/status')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Holatni o\'zgartirish va tarixni saqlash (REG-06)' })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegistryStatusDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.registry.changeStatus(id, dto.status, dto.reason, user, req.ip);
  }

  @Get('mediators/:id/status-history')
  @ApiParam({ name: 'id', description: 'Reyestr yozuvi UUID' })
  @ApiOperation({ summary: 'Holat o\'zgarishlari tarixi' })
  statusHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.registry.getStatusHistory(id, user);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Hudud doirasidagi reyestr statistikasi (REG-07)' })
  statistics(@Query() query: RegistryQueryDto, @CurrentUser() user: AuthUser) {
    return this.registry.getStatistics(query, user);
  }

  @Get('export')
  @ApiOperation({ summary: 'Filtrlangan reyestrni Excel formatida eksport qilish' })
  async exportExcel(
    @Query() query: RegistryQueryDto,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const buffer = await this.registry.exportExcel(query, user);
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="registry.xlsx"');
    return response.send(buffer);
  }

  @Get('imports/template')
  @ApiOperation({ summary: 'Excel import shablonini yuklab olish' })
  async importTemplate(@Res() response: Response) {
    const buffer = await this.registry.createImportTemplate();
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="registry-import-template.xlsx"');
    return response.send(buffer);
  }

  @Post('imports')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Excel fayldan reyestrga ommaviy import (REG-03)' })
  @ApiResponse({ status: 201, description: 'Import natijasi, takroriy yozuvlar va qator xatolari' })
  importExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.registry.importExcel(file, user, req.ip);
  }

  @Get('imports/:id')
  @ApiParam({ name: 'id', description: 'Import hisobot UUID' })
  @ApiOperation({ summary: 'Import hisoboti va xatoli qatorlar' })
  importResult(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.registry.getImportResult(id, user);
  }

  @Post('sync/run')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'my.gov.uz ga yuborilmagan reyestr o\'zgarishlarini qayta yuborish' })
  runSyncQueue() {
    return this.registry.runMyGovSyncQueue();
  }
}
