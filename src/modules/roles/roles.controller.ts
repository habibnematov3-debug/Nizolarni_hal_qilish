import { Controller, Get, Put, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { RolesService } from './roles.service';
import { UpdateRolePermissionsDto } from './dto/update-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Rollar va huquqlar (Roles & Permissions)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Rollar ro\'yxatini olish',
    description: 'Tizimdagi barcha rollar va ularga biriktirilgan huquqlar (permissions) ro\'yxati.',
  })
  @ApiResponse({ status: 200, description: 'Rollar ro\'yxati' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Mavjud barcha huquqlar (permissions) spravochnigini olish',
    description: 'Rollar sozlamalarida tanlash uchun barcha tizim huquqlari ro\'yxati.',
  })
  @ApiResponse({ status: 200, description: 'Huquqlar ro\'yxati' })
  async getAllPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Put(':id/permissions')
  @Roles('ADMIN', 'MINISTRY_STAFF')
  @ApiOperation({
    summary: 'Rol huquqlarini sozlash',
    description: 'Tanlangan rolga yangi huquqlarni biriktirish yoki eskilarni olib tashlash. Amal audit jurnaliga yoziladi.',
  })
  @ApiParam({ name: 'id', description: 'Rol ID si' })
  @ApiResponse({ status: 200, description: 'Rol huquqlari yangilandi' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.rolesService.updatePermissions(id, dto, user, ipAddress, userAgent);
  }
}
