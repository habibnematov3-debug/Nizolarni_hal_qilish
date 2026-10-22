import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { MyGovMediatorsQueryDto } from '../dto/mygov-mediators-query.dto';
import { IntegrationDirection, IntegrationStatus } from '@prisma/client';

export interface IMyGovPort {
  getMediatorsRegistryForMyGov(query: MyGovMediatorsQueryDto): Promise<any>;
}

@Injectable()
export class MyGovIntegrationAdapter implements IMyGovPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loggerService: IntegrationLoggerService,
  ) {}

  /**
   * Provides mediators registry data for my.gov.uz portal (GET /external/mygov/mediators)
   */
  async getMediatorsRegistryForMyGov(query: MyGovMediatorsQueryDto) {
    const startTime = Date.now();
    const { page = 1, limit = 20, region, specialization, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      registryStatus: 'MEDIATOR',
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (region) {
      where.address = { contains: region, mode: 'insensitive' };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          pinfl: true,
          phone: true,
          email: true,
          address: true,
          position: true,
          registryStatus: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const result = {
      source: 'Nizolarni muqobil hal etish yagona reyestri',
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        pinfl: u.pinfl ? `${u.pinfl.slice(0, 4)}******${u.pinfl.slice(-4)}` : null, // Masked for public Gov API
        phone: u.phone,
        email: u.email,
        address: u.address,
        status: 'ACTIVE',
        specializations: specialization ? [specialization] : ['CIVIL', 'FAMILY', 'ECONOMIC'],
        registrationDate: u.createdAt,
      })),
    };

    // Log inbound integration query
    await this.loggerService.log({
      serviceName: 'MY_GOV_UZ',
      direction: IntegrationDirection.INBOUND,
      status: IntegrationStatus.SUCCESS,
      endpoint: '/external/mygov/mediators',
      request: query,
      response: { total, returnedCount: users.length },
      durationMs: Date.now() - startTime,
    });

    return result;
  }
}
