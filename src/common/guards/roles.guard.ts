import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser & { organizationId?: string; region?: string };

    if (!user || !user.roles) {
      await this.logUnauthorizedAttempt(request, user, requiredRoles, 'Foydalanuvchi yoki rollar aniqlanmadi');
      throw new ForbiddenException('Ushbu amalni bajarish uchun ruxsat berilmagan');
    }

    // ADMIN has full access
    if (user.roles.includes('ADMIN')) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      // FT-AUTH-04 / AUTH-03: Ruxsatsiz urinishda 403 xatosi qaytadi va audit yoziladi
      await this.logUnauthorizedAttempt(
        request,
        user,
        requiredRoles,
        `Kerakli rollar: ${requiredRoles.join(', ')}. Foydalanuvchi rollari: ${user.roles.join(', ')}`,
      );

      throw new ForbiddenException(
        `Ushbu amalni faqat quyidagi rollar bajara oladi: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }

  private async logUnauthorizedAttempt(
    request: any,
    user: any,
    requiredRoles: string[],
    reason: string,
  ) {
    try {
      const ipAddress = request.ip || request.socket?.remoteAddress;
      const userAgent = request.headers ? request.headers['user-agent'] : null;

      await this.auditService.log({
        userId: user?.id || null,
        username: user?.username || 'ANONYMOUS',
        userFullName: user?.fullName || null,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityType: 'SECURITY',
        entityId: request.url,
        oldValues: {
          path: request.url,
          method: request.method,
          requiredRoles,
          reason,
        },
        ipAddress,
        userAgent,
      });
    } catch {
      // Do not block forbidden exception if audit logging fails
    }
  }
}
