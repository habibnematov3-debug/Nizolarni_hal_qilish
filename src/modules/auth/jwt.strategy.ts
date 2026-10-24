import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { getJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki hisob faol emas');
    }

    // Check inactivity timeout (FT-AUTH-06 / AUTH-05)
    // Default 30 minutes unless configured in system_settings or env
    const timeoutMinutes = parseInt(process.env.SESSION_INACTIVITY_MINUTES || '30', 10);
    const timeoutMs = timeoutMinutes * 60 * 1000;

    if (user.lastActiveAt) {
      const elapsed = Date.now() - new Date(user.lastActiveAt).getTime();
      if (elapsed > timeoutMs) {
        // Clear refresh token to invalidate session
        await this.prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new UnauthorizedException(
          `Faolsizlik muddati (${timeoutMinutes} daqiqa) tugaganligi sababli seans yakunlandi. Tizimga qayta kiring.`,
        );
      }
    }

    // Update lastActiveAt to current time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      pinfl: user.pinfl,
      organizationId: user.organizationId,
      organization: user.organization,
      region: user.organization?.region,
      cabinetType: user.cabinetType,
      registryStatus: user.registryStatus,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
