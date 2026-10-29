import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type MaintenanceState = { enabled: boolean; message: string; updatedAt?: string };

@Injectable()
export class MaintenanceService {
  private cachedState: MaintenanceState = { enabled: false, message: '' };
  private loaded = false;
  private loadedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async getState(): Promise<MaintenanceState> {
    if (!this.loaded || Date.now() - this.loadedAt > 1000) {
      const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'platformMaintenance' } });
      if (setting && setting.value && typeof setting.value === 'object' && !Array.isArray(setting.value)) {
        const value = setting.value as Record<string, unknown>;
        this.cachedState = {
          enabled: value.enabled === true,
          message: typeof value.message === 'string' ? value.message : '',
          ...(setting.updatedAt ? { updatedAt: setting.updatedAt.toISOString() } : {}),
        };
      }
      this.loaded = true;
      this.loadedAt = Date.now();
    }
    return this.cachedState;
  }

  async isEnabled(): Promise<boolean> {
    return (await this.getState()).enabled;
  }

  async update(enabled: boolean, message: string, actor: string): Promise<MaintenanceState> {
    const value = { enabled, message: message.trim() };
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: 'platformMaintenance' },
      create: {
        key: 'platformMaintenance',
        group: 'PLATFORM',
        value,
        description: 'Platform normal yoki texnik xizmat rejimi',
        updatedBy: actor,
      },
      update: { value, updatedBy: actor },
    });
    this.cachedState = { ...value, updatedAt: setting.updatedAt.toISOString() };
    this.loaded = true;
    this.loadedAt = Date.now();
    return this.cachedState;
  }
}
