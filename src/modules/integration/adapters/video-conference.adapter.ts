import { Injectable } from '@nestjs/common';
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

export interface IVideoConferencePort {
  createMeeting(topic: string, scheduledAt: string, durationMinutes?: number): Promise<MeetingRoomDetails>;
}

@Injectable()
export class VideoConferenceIntegrationAdapter implements IVideoConferencePort {
  constructor(private readonly loggerService: IntegrationLoggerService) {}

  async createMeeting(
    topic: string,
    scheduledAt: string,
    durationMinutes = 60,
  ): Promise<MeetingRoomDetails> {
    return this.loggerService.executeWithResilience(
      async () => {
        const roomId = `room_med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const expiresDate = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000);

        return {
          roomId,
          roomUrl: `https://meet.adliya.uz/${roomId}`,
          hostUrl: `https://meet.adliya.uz/${roomId}?role=host`,
          pin: Math.floor(100000 + Math.random() * 900000).toString(),
          topic,
          scheduledAt,
          expiresAt: expiresDate.toISOString(),
        };
      },
      {
        serviceName: 'VIDEO_CONFERENCE',
        endpoint: '/api/v1/meetings/create',
        timeoutMs: 5000,
        maxRetries: 1,
      },
      { topic, scheduledAt, durationMinutes },
    );
  }
}
