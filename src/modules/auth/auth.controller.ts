import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Autentifikatsiya (AUTH)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Tizimga kirish (Login)',
    description: 'Username va parol orqali tizimga kirish hamda JWT token olish.',
  })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish va JWT token' })
  @ApiResponse({ status: 401, description: 'Login yoki parol xato' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Joriy foydalanuvchi profilini olish',
    description: 'JWT token orqali kirgan foydalanuvchi ma\'lumotlari, rollari va huquqlari.',
  })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi ma\'lumotlari' })
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id);
  }
}
