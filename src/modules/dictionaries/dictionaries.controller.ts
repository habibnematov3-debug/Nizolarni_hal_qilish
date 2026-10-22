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
import { DictionariesService } from './dictionaries.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { QueryDictionaryDto } from './dto/query-dictionary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Spravochniklar boshqaruvi (Dictionaries)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dictionaries')
export class DictionariesController {
  constructor(private readonly dictService: DictionariesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Mavjud barcha spravochnik toifalarini olish',
    description: 'Tizimdagi barcha spravochniklar ro\'yxati (hududlar, ixtisosliklar, jazo turlari va h.k.) va ulardagi elementlar soni.',
  })
  @ApiResponse({ status: 200, description: 'Spravochnik toifalari ro\'yxati' })
  async getCategories() {
    return this.dictService.getCategories();
  }

  @Get(':name')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Spravochnik qiymatlari ro\'yxatini olish',
    description: 'Nom bo\'yicha (masalan: regions, specializations, penalty_types, case_statuses) spravochnik elementlarini olish.',
  })
  @ApiParam({
    name: 'name',
    example: 'regions',
    description: 'Spravochnik nomi (regions, specializations, penalty_types, case_statuses, contract_templates, exam_questions)',
  })
  @ApiResponse({ status: 200, description: 'Spravochnik elementlari' })
  async findItems(@Param('name') name: string, @Query() query: QueryDictionaryDto) {
    return this.dictService.findItems(name, query);
  }

  @Post(':name')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Spravochnikka yangi qiymat qo\'shish',
    description: 'Ko\'rsatilgan spravochnik toifasiga yangi qiymat qo\'shish.',
  })
  @ApiParam({ name: 'name', example: 'regions', description: 'Spravochnik nomi' })
  @ApiResponse({ status: 201, description: 'Yangi qiymat yaratildi' })
  async createItem(
    @Param('name') name: string,
    @Body() dto: CreateDictionaryItemDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.dictService.create(name, dto, user, ipAddress, userAgent);
  }

  @Patch(':name/:id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Spravochnik qiymatini o\'zgartirish yoki faolsizlantirish',
    description: 'Qiymatni tahrirlash yoki isActive=false qilib faolsizlantirish. Faolsizlantirilganda ham eski yozuvlardagi bog\'liqliklar saqlanadi.',
  })
  @ApiParam({ name: 'name', example: 'regions', description: 'Spravochnik nomi' })
  @ApiParam({ name: 'id', description: 'Spravochnik elementi ID si' })
  @ApiResponse({ status: 200, description: 'Qiymat yangilandi' })
  async updateItem(
    @Param('name') name: string,
    @Param('id') id: string,
    @Body() dto: UpdateDictionaryItemDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.dictService.update(name, id, dto, user, ipAddress, userAgent);
  }
}
