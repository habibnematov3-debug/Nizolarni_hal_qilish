import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Maxfiy sozlamalar konfiguratsiyasi
 */
interface SecretConfig {
  /** Kalit nomi */
  key: string;
  /** Majburiy yoki ixtiyoriy */
  required: boolean;
  /** Tavsif */
  description: string;
  /** Minimal uzunlik (ixtiyoriy) */
  minLength?: number;
}

/**
 * Sirlarni Boshqarish Xizmati Interfeysi
 */
export interface ISecretsService {
  get(key: string): string;
  getOptional(key: string, defaultValue?: string): string | undefined;
  validateAll(): void;
}

/**
 * Sirlarni Boshqarish Xizmati
 *
 * Barcha maxfiy sozlamalar faqat .env orqali yuklanadi.
 * Hech qachon kodda qattiq yozilmaydi.
 * Parollar va tokenlar log-da maskalanadi.
 */
@Injectable()
export class SecretsService implements ISecretsService, OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);

  /** Majburiy sozlamalar ro'yxati */
  private readonly requiredSecrets: SecretConfig[] = [
    {
      key: 'DATABASE_URL',
      required: true,
      description: 'PostgreSQL ulanish URL',
    },
    {
      key: 'JWT_SECRET',
      required: true,
      description: 'JWT imzolash kaliti',
      minLength: 32,
    },
    {
      key: 'JWT_EXPIRES_IN',
      required: true,
      description: 'JWT muddati',
    },
  ];

  /** Ixtiyoriy sozlamalar ro'yxati */
  private readonly optionalSecrets: SecretConfig[] = [
    {
      key: 'REDIS_HOST',
      required: false,
      description: 'Redis server manzili',
    },
    {
      key: 'REDIS_PASSWORD',
      required: false,
      description: 'Redis paroli',
    },
    {
      key: 'FILE_UPLOAD_PATH',
      required: false,
      description: 'Fayl saqlash papkasi',
    },
    {
      key: 'CORS_ORIGINS',
      required: false,
      description: 'Ruxsat berilgan CORS manzillar',
    },
  ];

  /** Maskalanishi kerak bo'lgan kalit nomlari */
  private readonly sensitiveKeys = [
    'PASSWORD',
    'SECRET',
    'TOKEN',
    'KEY',
    'PRIVATE',
    'HASH',
    'CREDENTIAL',
  ];

  onModuleInit(): void {
    this.validateAll();
  }

  /**
   * Majburiy sozlamani olish
   * @param key - Sozlama kaliti (.env-dagi nom)
   * @throws Error — agar sozlama topilmasa
   */
  get(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(
        `Majburiy sozlama topilmadi: ${key}. .env faylini tekshiring.`,
      );
    }
    return value;
  }

  /**
   * Ixtiyoriy sozlamani olish
   * @param key - Sozlama kaliti
   * @param defaultValue - Standart qiymat
   */
  getOptional(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Barcha majburiy sozlamalarni tekshirish
   * Xato bo'lsa ilovani ishga tushirmaslik
   */
  validateAll(): void {
    const errors: string[] = [];

    for (const secret of this.requiredSecrets) {
      const value = process.env[secret.key];

      if (!value) {
        errors.push(`[MAJBURIY] ${secret.key}: ${secret.description}`);
        continue;
      }

      if (secret.minLength && value.length < secret.minLength) {
        errors.push(
          `[UZUNLIK] ${secret.key}: kamida ${secret.minLength} belgi bo'lishi kerak (hozir: ${value.length})`,
        );
      }
    }

    if (errors.length > 0) {
      const message = `Muhit konfiguratsiyasi xatoliklari:\n${errors.join('\n')}`;
      this.logger.error(message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      }
    }

    // Yuklangan sozlamalar haqida hisobot (maxfiy qiymatlar maskalanadi)
    this.logLoadedSecrets();
  }

  /**
   * Yuklangan sozlamalar haqida xavfsiz log yozish
   * Parollar va tokenlar maskalanadi
   */
  private logLoadedSecrets(): void {
    const allSecrets = [...this.requiredSecrets, ...this.optionalSecrets];
    const loaded: string[] = [];

    for (const secret of allSecrets) {
      const value = process.env[secret.key];
      if (!value) continue;

      const displayValue = this.maskValue(secret.key, value);
      const status = secret.required ? '✓' : '○';
      loaded.push(`  ${status} ${secret.key}=${displayValue}`);
    }

    this.logger.log(`Muhit sozlamalari yuklandi:\n${loaded.join('\n')}`);
  }

  /**
   * Maxfiy qiymatni maskalash
   */
  private maskValue(key: string, value: string): string {
    const isSensitive = this.sensitiveKeys.some((s) =>
      key.toUpperCase().includes(s),
    );

    if (isSensitive) {
      if (value.length <= 4) return '***';
      return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 4, 12))}`;
    }

    // URL dan parolni maskalash
    if (key.includes('URL') && value.includes('@')) {
      return value.replace(/:([^@]+)@/, ':***@');
    }

    return value;
  }
}
