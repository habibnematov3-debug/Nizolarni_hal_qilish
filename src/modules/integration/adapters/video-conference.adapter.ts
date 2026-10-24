import { createHmac, randomBytes } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationLoggerService } from '../services/integration-logger.service';

export interface MeetingRoomDetails {
  roomId: string;
  roomUrl: string;
  hostUrl: string;
  pin: string;
  topic: string;
  scheduledAt: string;
  expiresAt: string;
}

export interface VideoJoinDetails {
  joinUrl: string;
  expiresAt: string;
  provider: 'JITSI_SELF_HOSTED';
}

export interface IVideoConferencePort {
  createMeeting(topic: string, scheduledAt: string, durationMinutes?: number): Promise<MeetingRoomDetails>;
  createJoinLink(roomId: string, user: { id: string; name: string; email?: string | null }, moderator: boolean, expiresAt: Date): VideoJoinDetails;
}

@Injectable()
export class VideoConferenceIntegrationAdapter implements IVideoConferencePort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async createMeeting(topic: string, scheduledAt: string, durationMinutes = 60): Promise<MeetingRoomDetails> {
    const config = this.getConfig();
    const roomId = `med-${randomBytes(18).toString('hex')}`;
    const expiresDate = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60_000);
    const roomUrl = `${config.baseUrl}/${roomId}`;
    const result = { roomId, roomUrl, hostUrl: roomUrl, pin: '', topic, scheduledAt, expiresAt: expiresDate.toISOString() };

    await this.loggerService.log({
      serviceName: 'VIDEO_CONFERENCE',
      direction: 'OUTBOUND' as any,
      status: 'SUCCESS' as any,
      endpoint: '/rooms/allocate',
      request: { roomId, scheduledAt, durationMinutes },
      response: { roomId, roomUrl },
    });
    return result;
  }

  createJoinLink(roomId: string, user: { id: string; name: string; email?: string | null }, moderator: boolean, expiresAt: Date): VideoJoinDetails {
    const config = this.getConfig();
    const now = Math.floor(Date.now() / 1000);
    const exp = Math.floor(expiresAt.getTime() / 1000);
    if (exp <= now) throw new ServiceUnavailableException('Uchrashuv havolasining amal qilish muddati tugagan');

    // Self-hosted Jitsi JWT authentication. The token is scoped to one room and
    // expires with the authorized meeting window. The secret never reaches the browser.
    const header = this.base64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = this.base64Url({
      aud: 'jitsi',
      iss: config.appId,
      sub: config.domain,
      room: roomId,
      iat: now,
      nbf: now - 5,
      exp,
      context: { user: { id: user.id, name: user.name, ...(user.email ? { email: user.email } : {}), moderator } },
    });
    const signingInput = `${header}.${payload}`;
    const signature = createHmac('sha256', config.appSecret).update(signingInput).digest('base64url');
    const jwt = `${signingInput}.${signature}`;
    const joinUrl = new URL(`${config.baseUrl}/${roomId}`);
    joinUrl.searchParams.set('jwt', jwt);
    return { joinUrl: joinUrl.toString(), expiresAt: new Date(exp * 1000).toISOString(), provider: 'JITSI_SELF_HOSTED' };
  }

  private base64Url(value: unknown) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private getConfig() {
    const baseUrl = process.env.JITSI_BASE_URL?.trim().replace(/\/$/, '');
    const appId = process.env.JITSI_APP_ID?.trim();
    const appSecret = process.env.JITSI_APP_SECRET;
    if (!baseUrl || !appId || !appSecret) {
      throw new ServiceUnavailableException('Videokonferensiya provayderi sozlanmagan. JITSI_BASE_URL, JITSI_APP_ID va JITSI_APP_SECRET talab qilinadi.');
    }
    let url: URL;
    try { url = new URL(baseUrl); } catch { throw new ServiceUnavailableException('JITSI_BASE_URL yaroqli HTTPS manzil bo‘lishi kerak'); }
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Production videokonferensiya manzili HTTPS bo‘lishi kerak');
    }
    return { baseUrl, appId, appSecret, domain: url.hostname.toLowerCase() };
  }
}
