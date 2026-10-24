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

    const endpoint = process.env.SMS_GATEWAY_URL?.trim();
    const token = process.env.SMS_GATEWAY_TOKEN?.trim();
    if (process.env.NODE_ENV === 'production' && (!endpoint || !token)) {
      return { success: false, error: 'Rasmiy SMS gateway URL yoki token production muhitida sozlanmagan' };
    }
    if (endpoint) {
      let url: URL;
      try { url = new URL(endpoint); }
      catch { return { success: false, error: 'SMS gateway URL formati noto‘g‘ri' }; }
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        return { success: false, error: 'Production SMS gateway HTTPS orqali ishlashi kerak' };
      }
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        attempt++;
        this.logger.log(`[SMS Gateway] ${endpoint ? 'Yuborish' : 'Demo yuborish'}: ${this.maskPhone(phone)}, urinish ${attempt}/${maxRetries + 1}, ${text.length} belgi`);
        if (!endpoint) return { success: true, messageId: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let response: Response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ to: phone, text }),
            signal: controller.signal,
          });
        } finally { clearTimeout(timeout); }
        const result = await response.json().catch(() => null) as { success?: unknown; messageId?: unknown } | null;
        if (!response.ok || result?.success !== true || typeof result.messageId !== 'string' || !result.messageId) {
          throw new Error(`SMS gateway yuborishni tasdiqlamadi (${response.status})`);
        }
        return { success: true, messageId: result.messageId };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'SMS gateway bilan aloqa uzildi';
        this.logger.warn(`[SMS Gateway] ${this.maskPhone(phone)} uchun ${attempt}-urinish bajarilmadi: ${errorMessage}`);
        if (attempt > maxRetries) {
          return { success: false, error: errorMessage };
        }
        // Small backoff before retry
        await new Promise((res) => setTimeout(res, 200));
      }
    }

    return { success: false, error: 'Barcha urinishlar muvaffaqiyatsiz tugadi' };
  }

  private maskPhone(phone: string) {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 2 ? `***${digits.slice(-2)}` : '***';
  }
}
