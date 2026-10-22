import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Foydalanuvchi profili (Obyektivka)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Shaxsiy ma\'lumotlar (Obyektivka)ni olish (FT-AUTH-05 / AUTH-04)',
    description: 'Foydalanuvchining to\'liq obyektivka ma\'lumotlari: JShShIR, pasport ma\'lumotlari, tug\'ilgan sana va joyi, millati, jinsi, manzili, aloqa ma\'lumotlari va tizimdagi maqomi.',
  })
  @ApiResponse({ status: 200, description: 'Shaxsiy ma\'lumotlar (obyektivka)' })
  async getMyProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Ruxsat etilgan shaxsiy ma\'lumotlarni tahrirlash (FT-AUTH-05 / AUTH-04)',
    description: 'Foydalanuvchi o\'zining telefon raqami, elektron pochtasi va yashash manzilini yangilashi mumkin. Davlat tizimlaridan olingan pasport, JShShIR, F.I.SH va tug\'ilgan sana tahrirlanmaydi. Amal audit jurnaliga to\'liq yoziladi.',
  })
  @ApiResponse({ status: 200, description: 'Profil muvaffaqiyatli yangilandi' })
  async updateMyProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.updateProfile(user.id, dto, user, ipAddress, userAgent);
  }
}
