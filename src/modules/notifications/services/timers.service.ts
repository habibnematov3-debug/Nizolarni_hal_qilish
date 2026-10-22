import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateTimerDto } from '../dto/update-timer.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { TimerUnit } from '@prisma/client';

@Injectable()
export class TimersService {
  private readonly logger = new Logger(TimersService.name);

  // Distributed lock flag for central scheduler execution (BIL-03)
  private isSchedulerLocked = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Acquire lock for scheduler tasks
   */
  acquireLock(): boolean {
    if (this.isSchedulerLocked) {
      return false;
    }
    this.isSchedulerLocked = true;
    return true;
  }

  /**
   * Release lock
   */
  releaseLock(): void {
    this.isSchedulerLocked = false;
  }

  /**
   * Get all timers
   */
  async getAllTimers() {
    return this.prisma.timerSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get timer by unique key
   */
  async getTimerByKey(key: string) {
    const timer = await this.prisma.timerSetting.findUnique({
      where: { key },
    });

    if (!timer) {
      throw new NotFoundException(`Taymer sozlamasi topilmadi: ${key}`);
    }

    return timer;
  }

  /**
   * Update timer duration or unit (PUT /admin/timers/{key})
   */
  async updateTimer(
    key: string,
    dto: UpdateTimerDto,
    user: AuthUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.getTimerByKey(key);

    const updated = await this.prisma.timerSetting.update({
      where: { key },
      data: {
        ...(dto.durationValue !== undefined ? { durationValue: dto.durationValue } : {}),
        ...(dto.durationUnit !== undefined ? { durationUnit: dto.durationUnit } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedBy: user.username,
      },
    });

    // Audit log (FT-BIL-05 / BIL-03)
    await this.auditService.log({
      userId: user.id,
      username: user.username,
      userFullName: user.fullName,
      action: 'UPDATE_TIMER',
      entityType: 'TIMER',
      entityId: key,
      oldValues: {
        durationValue: existing.durationValue,
        durationUnit: existing.durationUnit,
        isActive: existing.isActive,
      },
      newValues: {
        durationValue: updated.durationValue,
        durationUnit: updated.durationUnit,
        isActive: updated.isActive,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Calculate deadline based on timer setting
   */
  async calculateDeadline(key: string, fromDate = new Date()): Promise<Date> {
    const timer = await this.prisma.timerSetting.findUnique({
      where: { key },
    });

    const deadline = new Date(fromDate);
    if (!timer || !timer.isActive) {
      // Default fallback: 3 days
      deadline.setDate(deadline.getDate() + 3);
      return deadline;
    }

    switch (timer.durationUnit) {
      case TimerUnit.MINUTES:
        deadline.setMinutes(deadline.getMinutes() + timer.durationValue);
        break;
      case TimerUnit.HOURS:
        deadline.setHours(deadline.getHours() + timer.durationValue);
        break;
      case TimerUnit.DAYS:
        deadline.setDate(deadline.getDate() + timer.durationValue);
        break;
      case TimerUnit.MONTHS:
        deadline.setMonth(deadline.getMonth() + timer.durationValue);
        break;
    }

    return deadline;
  }
}
