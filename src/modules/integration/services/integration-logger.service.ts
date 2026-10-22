import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationDirection, IntegrationStatus, Prisma } from '@prisma/client';

export interface ExecuteResilienceOptions {
  serviceName: string;
  endpoint: string;
  direction?: IntegrationDirection;
  timeoutMs?: number;
  maxRetries?: number;
  fallbackValue?: any;
}

@Injectable()
export class IntegrationLoggerService {
  private readonly logger = new Logger(IntegrationLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an integration transaction (Inbound or Outbound)
   */
  async log(data: {
    serviceName: string;
    direction: IntegrationDirection;
    status: IntegrationStatus;
    endpoint: string;
    request?: any;
    response?: any;
    error?: string;
    durationMs?: number;
  }) {
    try {
      return await this.prisma.integrationLog.create({
        data: {
          serviceName: data.serviceName,
          direction: data.direction,
          status: data.status,
          endpoint: data.endpoint,
          request: data.request ? (data.request as Prisma.InputJsonValue) : Prisma.JsonNull,
          response: data.response ? (data.response as Prisma.InputJsonValue) : Prisma.JsonNull,
          error: data.error,
          durationMs: data.durationMs,
        },
      });
    } catch (err) {
      this.logger.error(`Integration logging failed: ${err.message}`, err.stack);
      return null;
    }
  }

  /**
   * Execute an external call with timeout, retry, and automatic logging
   * (Satisfies requirement: "Timeout, qayta urinish va xatolarni loglash sozlangan")
   */
  async executeWithResilience<T>(
    fn: () => Promise<T>,
    options: ExecuteResilienceOptions,
    requestPayload?: any,
  ): Promise<T> {
    const {
      serviceName,
      endpoint,
      direction = IntegrationDirection.OUTBOUND,
      timeoutMs = 5000,
      maxRetries = 2,
      fallbackValue,
    } = options;

    const startTime = Date.now();
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        // Timeout promise race
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${serviceName} javob berish vaqti (${timeoutMs}ms) tugadi`)), timeoutMs),
          ),
        ]);

        const durationMs = Date.now() - startTime;
        await this.log({
          serviceName,
          direction,
          status: IntegrationStatus.SUCCESS,
          endpoint,
          request: requestPayload,
          response: result,
          durationMs,
        });

        return result;
      } catch (err) {
        lastError = err;
        this.logger.warn(`[${serviceName}] Call failed on attempt ${attempt}/${maxRetries + 1}: ${err.message}`);

        if (attempt <= maxRetries) {
          // Exponential backoff
          await new Promise((res) => setTimeout(res, 200 * attempt));
        }
      }
    }

    const durationMs = Date.now() - startTime;
    await this.log({
      serviceName,
      direction,
      status: lastError?.message?.includes('Timeout') ? IntegrationStatus.TIMEOUT : IntegrationStatus.FAILED,
      endpoint,
      request: requestPayload,
      error: lastError?.message || 'Noma\'lum xatolik',
      durationMs,
    });

    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    throw lastError;
  }
}
