import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Kontent boshqaruvi (Content Management)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get(':type')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Kontentlar ro\'yxatini olish',
    description: 'Turi bo\'yicha (news, legal_framework, templates, faq, manuals, video_manuals, announcements) kontentlar ro\'yxati.',
  })
  @ApiParam({
    name: 'type',
    example: 'news',
    description: 'Kontent turi: news, legal_framework, templates, faq, manuals, video_manuals, announcements',
  })
  @ApiResponse({ status: 200, description: 'Kontentlar ro\'yxati' })
  async findAll(@Param('type') type: string, @Query() query: QueryContentDto) {
    return this.contentService.findAll(type, query);
  }

  @Get(':type/:id')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Kontent tafsilotini olish',
    description: 'Bitta kontent yozuvining to\'liq ma\'lumotlari.',
  })
  @ApiParam({ name: 'type', example: 'news' })
  @ApiParam({ name: 'id', description: 'Kontent ID si' })
  @ApiResponse({ status: 200, description: 'Kontent tafsiloti' })
  async findOne(@Param('type') type: string, @Param('id') id: string) {
    return this.contentService.findOne(type, id);
  }

  @Post(':type')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Yangi kontent qo\'shish',
    description: 'Yangilik, huquqiy baza, namuna, FAQ, qo\'llanma yoki e\'lon qo\'shish. Ko\'p tillilik qo\'llab-quvvatlanadi.',
  })
  @ApiParam({ name: 'type', example: 'news' })
  @ApiResponse({ status: 201, description: 'Kontent muvaffaqiyatli yaratildi' })
  async create(
    @Param('type') type: string,
    @Body() dto: CreateContentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.contentService.create(type, dto, user, ipAddress, userAgent);
  }

  @Put(':type/:id')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Kontentni tahrirlash',
    description: 'Mavjud kontent ma\'lumotlarini yangilash. O\'zgarish audit jurnaliga yoziladi.',
  })
  @ApiParam({ name: 'type', example: 'news' })
  @ApiParam({ name: 'id', description: 'Kontent ID si' })
  @ApiResponse({ status: 200, description: 'Kontent muvaffaqiyatli yangilandi' })
  async update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.contentService.update(type, id, dto, user, ipAddress, userAgent);
  }

  @Delete(':type/:id')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Kontentni olib tashlash (o\'chirish)',
    description: 'Kontentni bazadan butunlay o\'chirish. O\'chirish amali audit jurnaliga qayd etiladi.',
  })
  @ApiParam({ name: 'type', example: 'news' })
  @ApiParam({ name: 'id', description: 'Kontent ID si' })
  @ApiResponse({ status: 200, description: 'Kontent olib tashlandi' })
  async delete(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.contentService.delete(type, id, user, ipAddress, userAgent);
  }

  @Post(':type/:id/publish')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Kontentni nashr qilish',
    description: 'Kontent holatini PUBLISHED ga o\'tkazish va nashr sanasini belgilash.',
  })
  @ApiParam({ name: 'type', example: 'news' })
  @ApiParam({ name: 'id', description: 'Kontent ID si' })
  @ApiResponse({ status: 200, description: 'Kontent nashr qilindi' })
  async publish(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.contentService.publish(type, id, user, ipAddress, userAgent);
  }
}
