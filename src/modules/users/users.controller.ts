import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignUserRolesDto } from './dto/assign-roles.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Foydalanuvchilar boshqaruvi (Users)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Foydalanuvchilar ro\'yxatini olish',
    description: 'Barcha foydalanuvchilar ro\'yxati. Tashkilot, rol, status bo\'yicha filtrlash va qidiruv mavjud.',
  })
  @ApiResponse({ status: 200, description: 'Foydalanuvchilar ro\'yxati' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Yangi foydalanuvchi qo\'shish',
    description: 'Foydalanuvchi yaratish, tashkilotga va rollarga biriktirish.',
  })
  @ApiResponse({ status: 201, description: 'Foydalanuvchi muvaffaqiyatli yaratildi' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.create(dto, user, ipAddress, userAgent);
  }

  @Get(':id')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Foydalanuvchi tafsilotlarini olish',
    description: 'Foydalanuvchi ma\'lumotlari, uning tashkiloti, rollari va barcha huquqlari.',
  })
  @ApiParam({ name: 'id', description: 'Foydalanuvchi ID si' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi tafsilotlari' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Foydalanuvchini tahrirlash',
    description: 'Foydalanuvchi ma\'lumotlarini o\'zgartirish, bloklash yoki faolsizlantirish.',
  })
  @ApiParam({ name: 'id', description: 'Foydalanuvchi ID si' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi yangilandi' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.update(id, dto, user, ipAddress, userAgent);
  }

  @Put(':id/roles')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Foydalanuvchini rollarga biriktirish',
    description: 'Foydalanuvchining rollarini yangilash. Ushbu amal audit jurnaliga to\'liq yoziladi.',
  })
  @ApiParam({ name: 'id', description: 'Foydalanuvchi ID si' })
  @ApiResponse({ status: 200, description: 'Rollar yangilandi' })
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignUserRolesDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.assignRoles(id, dto, user, ipAddress, userAgent);
  }
}
