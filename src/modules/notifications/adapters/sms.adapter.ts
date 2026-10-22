import { Injectable, Logger } from '@nestjs/common';

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsAdapter {
  private readonly logger = new Logger(SmsAdapter.name);

  /**
   * Asynchronously sends SMS via telecom provider (PlayMobile / Eskiz / Gateway)
   * with retry capability.
   */
  async sendSms(phone: string, text: string, maxRetries = 2): Promise<SendSmsResult> {
    if (!phone || !text) {
      return { success: false, error: 'Telefon raqami yoki xabar matni bo\'sh' };
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        attempt++;
        this.logger.log(`[SMS Gateway] Sending SMS to ${phone} (Attempt ${attempt}/${maxRetries + 1}): "${text.slice(0, 40)}..."`);

        // In production, makes HTTPS POST to SMS gateway:
        // await fetch('https://sms-gateway.adliya.uz/api/send', ...)
        // Simulate carrier response
        const messageId = `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        return {
          success: true,
          messageId,
        };
      } catch (err) {
        this.logger.warn(`[SMS Gateway] Attempt ${attempt} failed for ${phone}: ${err.message}`);
        if (attempt > maxRetries) {
          return { success: false, error: err.message };
        }
        // Small backoff before retry
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    return { success: false, error: 'Barcha urinishlar muvaffaqiyatsiz tugadi' };
  }
}
