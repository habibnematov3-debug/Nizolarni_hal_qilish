import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationDto } from './dto/query-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tashkilotlar boshqaruvi (Organizations)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tashkilotlar ro\'yxati yoki ierarxiya daraxtini olish',
    description: 'Barcha tashkilotlar (Vazirlik, viloyat boshqarmalari, o\'quv markazlari) ro\'yxati va ierarxiyasi.',
  })
  @ApiResponse({ status: 200, description: 'Tashkilotlar ro\'yxati' })
  async findAll(@Query() query: QueryOrganizationDto) {
    return this.orgsService.findAll(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Yangi tashkilot qo\'shish',
    description: 'Yangi tashkilot yaratish va uni ierarxiyada yuqori tashkilotga biriktirish.',
  })
  @ApiResponse({ status: 201, description: 'Tashkilot muvaffaqiyatli yaratildi' })
  async create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.orgsService.create(dto, user, ipAddress, userAgent);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tashkilot tafsilotlarini olish',
    description: 'ID bo\'yicha tashkilotning to\'liq ma\'lumoti, yuqori tashkiloti va quyi tashkilotlari (filiallari).',
  })
  @ApiParam({ name: 'id', description: 'Tashkilot ID si' })
  @ApiResponse({ status: 200, description: 'Tashkilot tafsilotlari' })
  async findOne(@Param('id') id: string) {
    return this.orgsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Tashkilotni tahrirlash yoki faolsizlantirish',
    description: 'Tashkilot ma\'lumotlarini o\'zgartirish, yuqori tashkilotini almashtirish yoki holatini INACTIVE qilish.',
  })
  @ApiParam({ name: 'id', description: 'Tashkilot ID si' })
  @ApiResponse({ status: 200, description: 'Tashkilot yangilandi' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.orgsService.update(id, dto, user, ipAddress, userAgent);
  }
}
