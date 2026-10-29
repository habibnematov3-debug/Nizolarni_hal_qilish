import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';
import { SmsAdapter } from '../adapters/sms.adapter';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
    private readonly smsAdapter: SmsAdapter,
  ) {}

  /**
   * Get user's notifications in personal cabinet (GET /cabinet/notifications)
   * FT-BIL-04 / BIL-04
   */
  async getUserNotifications(userId: string, query: QueryNotificationsDto) {
    const { page = 1, limit = 10, channel, status, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark single notification as read (PATCH /cabinet/notifications/{id}/read)
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Bildirishnoma topilmadi: ${notificationId}`);
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });
  }

  /**
   * Mark all user's notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    return {
      success: true,
      updatedCount: result.count,
      message: 'Barcha xabarlar o\'qilgan deb belgilandi',
    };
  }

  /**
   * Send notification via Cabinet and/or SMS (FT-BIL-01, FT-BIL-02 / BIL-01)
   */
  async send(dto: SendNotificationDto) {
    // 1. Idempotency check: "Bir xabar ikki marta yuborilmaydi"
    if (dto.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          OR: [
            { idempotencyKey: dto.idempotencyKey },
            { idempotencyKey: `${dto.idempotencyKey}_CABINET` },
            { idempotencyKey: `${dto.idempotencyKey}_SMS` },
          ],
        },
      });
      if (existing) {
        this.logger.warn(`Notification with idempotencyKey "${dto.idempotencyKey}" already processed.`);
        return {
          idempotent: true,
          message: 'Ushbu xabar avval yuborilgan (idempotent)',
          notification: existing,
        };
      }
    }

    // 2. Fetch recipient
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!recipient) {
      throw new NotFoundException(`Qabul qiluvchi foydalanuvchi topilmadi: ${dto.userId}`);
    }

    // 3. Fetch template
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code: dto.templateCode },
    });

    // Merge default variables with user profile
    const mergedVariables = {
      fullName: recipient.fullName,
      phone: recipient.phone,
      email: recipient.email,
      ...(dto.variables || {}),
    };

    let title = 'Platforma bildirishnomasi';
    let content = 'Sizda yangi xabar mavjud.';
    let smsText = 'Sizda yangi xabar mavjud. platforma.adliya.uz';

    if (template) {
      const rendered = this.templateEngine.render(template, mergedVariables);
      title = rendered.title;
      content = rendered.content;
      smsText = rendered.smsText;
    } else if (dto.variables?.title && dto.variables?.content) {
      title = dto.variables.title;
      content = dto.variables.content;
      smsText = dto.variables.content;
    }

    const requestedChannels = dto.channels && dto.channels.length > 0
      ? dto.channels
      : [NotificationChannel.CABINET, NotificationChannel.SMS];
    const channels = requestedChannels.filter((channel) => recipient.notificationChannels.includes(channel));

    const results: any[] = [];

    // 4. Dispatch to CABINET
    if (channels.includes(NotificationChannel.CABINET)) {
      const cabinetNotif = await this.prisma.notification.create({
        data: {
          userId: recipient.id,
          channel: NotificationChannel.CABINET,
          templateCode: dto.templateCode,
          title,
          content,
          metadata: dto.variables ? (dto.variables as Prisma.InputJsonValue) : Prisma.JsonNull,
          status: NotificationStatus.DELIVERED,
          sentAt: new Date(),
          idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}_CABINET` : null,
        },
      });
      results.push(cabinetNotif);
    }

    // 5. Dispatch to SMS (asynchronous with retry mechanism)
    if (channels.includes(NotificationChannel.SMS) && recipient.phone) {
      const smsRecord = await this.prisma.notification.create({
        data: {
          userId: recipient.id,
          channel: NotificationChannel.SMS,
          templateCode: dto.templateCode,
          title: 'SMS Xabarnoma',
          content: smsText,
          metadata: { phone: recipient.phone } as Prisma.InputJsonValue,
          status: NotificationStatus.PENDING,
          idempotencyKey: dto.idempotencyKey ? `${dto.idempotencyKey}_SMS` : null,
        },
      });

      // Asynchronously send SMS via adapter
      const smsRes = await this.smsAdapter.sendSms(recipient.phone, smsText);
      const updatedSms = await this.prisma.notification.update({
        where: { id: smsRecord.id },
        data: {
          status: smsRes.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: smsRes.success ? new Date() : null,
          failedReason: smsRes.error || null,
          retryCount: smsRes.success ? 0 : 1,
        },
      });
      results.push(updatedSms);
    }

    const deliveredChannels = results
      .filter((notification) => [NotificationStatus.DELIVERED, NotificationStatus.SENT].includes(notification.status))
      .map((notification) => notification.channel);
    const failedChannels = channels.filter((channel) => !deliveredChannels.includes(channel));
    return {
      success: failedChannels.length === 0,
      requestedChannels: channels,
      deliveredChannels,
      failedChannels,
      notifications: results,
    };
  }
}
