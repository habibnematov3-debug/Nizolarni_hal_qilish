import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OneIdAdapter } from './adapters/one-id.adapter';
import { EsignAdapter } from './adapters/esign.adapter';
import { MobileIdAdapter } from './adapters/mobile-id.adapter';
import { OneIdLoginDto } from './dto/oneid-login.dto';
import { EsignLoginDto } from './dto/esign-login.dto';
import { MobileIdLoginDto } from './dto/mobile-id-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginDto } from './dto/login.dto';
import { resolveUserCabinetAndRoles } from './helpers/cabinet-resolver.helper';
import { AuthProvider, CabinetType, RegistryStatus, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly oneIdAdapter: OneIdAdapter,
    private readonly esignAdapter: EsignAdapter,
    private readonly mobileIdAdapter: MobileIdAdapter,
  ) {}

  /**
   * Helper: generate access & refresh tokens and persist session
   */
  private async createSession(user: any, method: string, ipAddress?: string, userAgent?: string) {
    const roles = user.userRoles?.map((ur: any) => ur.role.name) || [];
    const resolved = resolveUserCabinetAndRoles(roles, user.registryStatus);

    // Update cabinetType in DB if different
    if (user.cabinetType !== resolved.cabinetType) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { cabinetType: resolved.cabinetType },
      });
      user.cabinetType = resolved.cabinetType;
    }

    const payload = {
      sub: user.id,
      username: user.username,
      pinfl: user.pinfl,
      cabinetType: resolved.cabinetType,
      roles: resolved.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Update user session
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: refreshTokenHash,
        lastActiveAt: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      newValues: {
        method,
        cabinetType: resolved.cabinetType,
        roles: resolved.roles,
        loginTime: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      cabinetType: resolved.cabinetType,
      primaryRole: resolved.primaryRole,
      roles: resolved.roles,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        pinfl: user.pinfl,
        email: user.email,
        phone: user.phone,
        cabinetType: resolved.cabinetType,
        registryStatus: user.registryStatus,
        organization: user.organization,
      },
    };
  }

  /**
   * 1. ONE ID orqali kirish (POST /auth/oneid/login)
   */
  async loginWithOneId(dto: OneIdLoginDto, ipAddress?: string, userAgent?: string) {
    const profile = await this.oneIdAdapter.getCitizenProfile(dto.code, dto.mockPinfl);

    // Find or create user by pinfl or oneIdUserId
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { pinfl: profile.pinfl },
          { oneIdUserId: profile.oneIdUserId },
        ],
      },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      // Find default TALABGOR role
      const talabgorRole = await this.prisma.role.findUnique({
        where: { name: 'TALABGOR' },
      });

      const username = `oneid_${profile.pinfl}`;
      user = await this.prisma.user.create({
        data: {
          username,
          fullName: profile.fullName,
          pinfl: profile.pinfl,
          passportSeriesNumber: profile.passportSeriesNumber,
          passportGivenDate: profile.passportGivenDate,
          passportExpireDate: profile.passportExpireDate,
          birthDate: profile.birthDate,
          birthPlace: profile.birthPlace,
          nationality: profile.nationality,
          gender: profile.gender,
          address: profile.address,
          phone: profile.phone,
          email: profile.email,
          authProvider: AuthProvider.ONE_ID,
          oneIdUserId: profile.oneIdUserId,
          registryStatus: RegistryStatus.NONE,
          cabinetType: CabinetType.PARTY,
          status: UserStatus.ACTIVE,
          ...(talabgorRole
            ? {
                userRoles: {
                  create: [{ roleId: talabgorRole.id }],
                },
              }
            : {}),
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    } else {
      // Update Gov-verified profile fields
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: profile.fullName,
          passportSeriesNumber: profile.passportSeriesNumber,
          passportGivenDate: profile.passportGivenDate,
          passportExpireDate: profile.passportExpireDate,
          birthDate: profile.birthDate,
          birthPlace: profile.birthPlace,
          nationality: profile.nationality,
          gender: profile.gender,
          address: profile.address,
          oneIdUserId: profile.oneIdUserId,
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas yoki bloklangan');
    }

    return this.createSession(user, 'ONE_ID', ipAddress, userAgent);
  }

  /**
   * 2. E-IMZO orqali kirish (POST /auth/esign/login)
   */
  async loginWithEsign(dto: EsignLoginDto, ipAddress?: string, userAgent?: string) {
    const cert = await this.esignAdapter.verifySignature(dto.pkcs7, dto.mockPinfl);

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { pinfl: cert.pinfl },
          { esignSerialNumber: cert.serialNumber },
        ],
      },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      const talabgorRole = await this.prisma.role.findUnique({
        where: { name: 'TALABGOR' },
      });

      const username = `esign_${cert.pinfl}`;
      user = await this.prisma.user.create({
        data: {
          username,
          fullName: cert.fullName,
          pinfl: cert.pinfl,
          authProvider: AuthProvider.E_SIGN,
          esignSerialNumber: cert.serialNumber,
          registryStatus: RegistryStatus.NONE,
          cabinetType: CabinetType.PARTY,
          status: UserStatus.ACTIVE,
          ...(talabgorRole
            ? {
                userRoles: {
                  create: [{ roleId: talabgorRole.id }],
                },
              }
            : {}),
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          esignSerialNumber: cert.serialNumber,
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas yoki bloklangan');
    }

    return this.createSession(user, 'E_SIGN', ipAddress, userAgent);
  }

  /**
   * 3. Mobil ID orqali kirish (POST /auth/mobile-id/login)
   */
  async loginWithMobileId(dto: MobileIdLoginDto, ipAddress?: string, userAgent?: string) {
    const mobileProfile = await this.mobileIdAdapter.verifyCode(
      dto.phone,
      dto.code,
      dto.mockPinfl,
    );

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: mobileProfile.phone },
          { pinfl: mobileProfile.pinfl },
        ],
      },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      const talabgorRole = await this.prisma.role.findUnique({
        where: { name: 'TALABGOR' },
      });

      const username = `mobile_${mobileProfile.phone.replace(/\D/g, '')}`;
      user = await this.prisma.user.create({
        data: {
          username,
          fullName: mobileProfile.fullName,
          phone: mobileProfile.phone,
          pinfl: mobileProfile.pinfl,
          authProvider: AuthProvider.MOBILE_ID,
          mobileIdPhone: mobileProfile.phone,
          registryStatus: RegistryStatus.NONE,
          cabinetType: CabinetType.PARTY,
          status: UserStatus.ACTIVE,
          ...(talabgorRole
            ? {
                userRoles: {
                  create: [{ roleId: talabgorRole.id }],
                },
              }
            : {}),
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          mobileIdPhone: mobileProfile.phone,
          phone: user.phone || mobileProfile.phone,
        },
        include: {
          organization: true,
          userRoles: { include: { role: true } },
        },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas yoki bloklangan');
    }

    return this.createSession(user, 'MOBILE_ID', ipAddress, userAgent);
  }

  /**
   * 4. Seansni yangilash (POST /auth/refresh)
   */
  async refreshSession(dto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati tugagan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Seans mavjud emas yoki foydalanuvchi tizimdan chiqqan');
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Refresh token mos kelmadi');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const resolved = resolveUserCabinetAndRoles(roles, user.registryStatus);

    const newAccessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        pinfl: user.pinfl,
        cabinetType: resolved.cabinetType,
        roles: resolved.roles,
      },
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
    );

    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: newRefreshHash,
        lastActiveAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'REFRESH',
      entityType: 'AUTH',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      cabinetType: resolved.cabinetType,
      roles: resolved.roles,
    };
  }

  /**
   * 5. Tizimdan chiqish (POST /auth/logout)
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });

      await this.auditService.log({
        userId: user.id,
        username: user.username,
        userFullName: user.fullName,
        action: 'LOGOUT',
        entityType: 'AUTH',
        entityId: user.id,
        ipAddress,
        userAgent,
      });
    }

    return { success: true, message: 'Seans muvaffaqiyatli yakunlandi' };
  }

  /**
   * 6. Joriy foydalanuvchi, rollari va kabinet turi (GET /auth/me)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const rawRoles = user.userRoles.map((ur) => ur.role.name);
    const resolved = resolveUserCabinetAndRoles(rawRoles, user.registryStatus);

    const permissions = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    );

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      pinfl: user.pinfl,
      email: user.email,
      phone: user.phone,
      cabinetType: resolved.cabinetType,
      primaryRole: resolved.primaryRole,
      registryStatus: user.registryStatus,
      authProvider: user.authProvider,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            type: user.organization.type,
            region: user.organization.region,
          }
        : null,
      roles: resolved.roles,
      permissions,
      lastActiveAt: user.lastActiveAt,
    };
  }

  /**
   * Dev/Admin fallback login (POST /auth/login)
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }, { phone: username }, { pinfl: username }],
      },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas yoki bloklangan');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    return this.createSession(user, 'PASSWORD', ipAddress, userAgent);
  }
}
