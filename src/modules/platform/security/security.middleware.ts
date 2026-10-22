import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * Xavfsizlik Middleware
 *
 * Quyidagi funksiyalarni bajaradi:
 * - Helmet headers (CSP, HSTS, X-Frame-Options va h.k.)
 * - Rate limiting (IP bo'yicha, 100 req/min)
 * - CORS konfiguratsiya
 * - Request ID generatsiya
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  /** Rate limiting uchun IP → {count, resetAt} xaritasi */
  private readonly ipRequestMap = new Map<string, { count: number; resetAt: number }>();

  /** Rate limit: IP bo'yicha daqiqada 100 ta so'rov */
  private readonly RATE_LIMIT = 100;
  private readonly RATE_WINDOW_MS = 60 * 1000; // 1 daqiqa

  /** Ruxsat berilgan CORS manzillar */
  private readonly allowedOrigins: string[];

  constructor() {
    const corsEnv = process.env.CORS_ORIGINS || 'http://localhost:3001';
    this.allowedOrigins = corsEnv.split(',').map((o) => o.trim());
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Request ID generatsiya
    const requestId = crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // 2. Xavfsizlik headerlari (Helmet-ga o'xshash)
    this.setSecurityHeaders(res);

    // 3. CORS sozlash
    this.handleCors(req, res);

    // 4. Rate limiting (health endpoint uchun yo'q)
    if (req.path !== '/platform/health') {
      const isRateLimited = this.checkRateLimit(req, res);
      if (isRateLimited) return;
    }

    next();
  }

  /**
   * Xavfsizlik headerlarini o'rnatish
   * Helmet headerlarini qo'lda implementatsiya
   */
  private setSecurityHeaders(res: Response): void {
    // HSTS (Strict-Transport-Security)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    // X-Frame-Options: clickjacking dan himoya
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // X-Content-Type-Options: MIME type sniffing dan himoya
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content-Security-Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none';",
    );

    // Permissions-Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Server sarlavhasini yashirish
    res.removeHeader('X-Powered-By');
  }

  /**
   * CORS so'rovlarini boshqarish
   */
  private handleCors(req: Request, res: Response): void {
    const origin = req.headers.origin;

    if (origin && this.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Request-ID',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    // Preflight so'rovi
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
  }

  /**
   * IP bo'yicha rate limiting tekshirish
   * @returns true — agar so'rov bloklangan bo'lsa
   */
  private checkRateLimit(req: Request, res: Response): boolean {
    const ip = this.getClientIp(req);
    const now = Date.now();

    const record = this.ipRequestMap.get(ip);

    if (!record || now > record.resetAt) {
      // Yangi oyna
      this.ipRequestMap.set(ip, {
        count: 1,
        resetAt: now + this.RATE_WINDOW_MS,
      });
      return false;
    }

    record.count++;

    if (record.count > this.RATE_LIMIT) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);

      this.logger.warn(
        `Rate limit oshirildi: IP=${ip}, Count=${record.count}, URL=${req.url}`,
      );

      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', this.RATE_LIMIT.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.status(429).json({
        statusCode: 429,
        message: `Juda ko'p so'rovlar. ${retryAfter} soniyadan keyin qaytadan urinib ko'ring.`,
        error: 'Too Many Requests',
      });
      return true;
    }

    const remaining = this.RATE_LIMIT - record.count;
    res.setHeader('X-RateLimit-Limit', this.RATE_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());

    return false;
  }

  /**
   * Mijoz IP manzilini olish (proxy orqali)
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }
}
