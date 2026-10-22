import {
  Injectable,
  Logger,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Audit Immutable Guard
 *
 * Audit yozuvlarini o'zgartirish yoki o'chirishdan himoya qiladi.
 * Har qanday PUT, PATCH, DELETE so'rovlar uchun 403 Forbidden qaytaradi.
 *
 * Qo'llash:
 * @UseGuards(AuditImmutableGuard)
 */
@Injectable()
export class AuditImmutableGuard implements CanActivate {
  private readonly logger = new Logger(AuditImmutableGuard.name);

  /**
   * Audit yozuvlariga o'zgartirish so'rovlarini bloklash
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // O'qish so'rovlariga ruxsat
    if (method === 'GET') {
      return true;
    }

    // Barcha o'zgartirish va o'chirish so'rovlarini bloklash
    if (['PUT', 'PATCH', 'DELETE'].includes(method)) {
      this.logger.warn(
        `Audit yozuvini o'zgartirish urinishi bloklandi: ${method} ${request.url} — Foydalanuvchi: ${request.user?.id ?? 'noma\'lum'}`,
      );
      throw new ForbiddenException(
        'Audit yozuvlari o\'zgartirib bo\'lmaydi. Audit loglari immutable (o\'zgarmas) hisoblanadi.',
      );
    }

    // POST uchun (yangi yozuv qo'shish) ruxsat beriladi
    return true;
  }
}
