import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OneIdLoginDto } from './dto/oneid-login.dto';
import { EsignLoginDto } from './dto/esign-login.dto';
import { MobileIdLoginDto } from './dto/mobile-id-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Autentifikatsiya va seanslar (AUTH)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('oneid/login')
  @ApiOperation({
    summary: 'ONE ID orqali tizimga kirish (FT-AUTH-01 / AUTH-01)',
    description: 'Yagona identifikatsiya tizimi (ONE ID) dan qaytgan avtorizatsiya kodi orqali kirish. Fuqaro profili avtomatik yuklanadi va mos kabinet ochiladi.',
  })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish va seans tokenlari' })
  async loginWithOneId(@Body() dto: OneIdLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithOneId(dto, ipAddress, userAgent);
  }

  @Post('esign/login')
  @ApiOperation({
    summary: 'E-imzo (Elektron raqamli imzo) orqali tizimga kirish (FT-AUTH-01 / AUTH-01)',
    description: 'E-imzo (PKCS#7) orqali shaxsni tasdiqlab kirish. Sertifikat egasining JShShIR bo\'yicha kabinet ochiladi.',
  })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish va seans tokenlari' })
  async loginWithEsign(@Body() dto: EsignLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithEsign(dto, ipAddress, userAgent);
  }

  @Post('mobile-id/login')
  @ApiOperation({
    summary: 'Mobil ID orqali tizimga kirish (FT-AUTH-01 / AUTH-01)',
    description: 'Mobil ID orqali telefon raqamiga yuborilgan tasdiqlash kodi yordamida kirish.',
  })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish va seans tokenlari' })
  async loginWithMobileId(@Body() dto: MobileIdLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithMobileId(dto, ipAddress, userAgent);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Seansni yangilash (FT-AUTH-06 / AUTH-05)',
    description: 'Refresh token orqali yangi Access va Refresh tokenlarni olish.',
  })
  @ApiResponse({ status: 200, description: 'Yangi tokenlar berildi' })
  async refreshSession(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshSession(dto, ipAddress, userAgent);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Tizimdan chiqish (FT-AUTH-06 / AUTH-05)',
    description: 'Seansni yakunlash va refresh tokenni bekor qilish.',
  })
  @ApiResponse({ status: 200, description: 'Seans yopildi' })
  async logout(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(user.id, ipAddress, userAgent);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Joriy foydalanuvchi, rollari va kabinet turi (AUTH-02, AUTH-03)',
    description: 'Tizimga kirgan foydalanuvchining shaxsiy ma\'lumotlari, kabinet turi (PARTY: fuqaro/yuridik shaxs; SPECIALIST: talabgor, mediator, hakamlik sudyasi, arbitr; PUBLIC_AUTHORITY: komissiya va adliya organlari; ADMIN: administrator), aniq rollari va ruxsatlari.',
  })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi va kabinet ma\'lumotlari' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Admin / Xodimlar uchun parolli kirish (Dev/Fallback)',
    description: 'Login va parol orqali tizimga kirish (tizim administratorlari va operatorlar uchun).',
  })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }
}
