import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationLoggerService } from '../services/integration-logger.service';
import { MyGovMediatorsQueryDto } from '../dto/mygov-mediators-query.dto';
import { IntegrationDirection, IntegrationStatus, Prisma, RegistryEntryStatus, RegistryType } from '@prisma/client';

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

    const where: Prisma.RegistryEntryWhereInput = {
      type: RegistryType.MEDIATOR,
      status: RegistryEntryStatus.ACTIVE,
      publicProfile: true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }
    if (specialization) {
      where.specialization = { has: specialization };
    }

    const [total, entries] = await Promise.all([
      this.prisma.registryEntry.count({ where }),
      this.prisma.registryEntry.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          registryNumber: true,
          fullName: true,
          type: true,
          photoUrl: true,
          phone: true,
          address: true,
          region: true,
          education: true,
          specialization: true,
          languages: true,
          latitude: true,
          longitude: true,
          status: true,
          certificateNumber: true,
          certificateIssuedAt: true,
          certificateExpiresAt: true,
          registeredAt: true,
        },
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const result = {
      source: 'Nizolarni muqobil hal etish yagona reyestri',
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: entries.map((entry) => ({
        ...entry,
        specializations: entry.specialization,
        profileUrl: `/public/mediators/${entry.id}`,
      })),
    };

    // Log inbound integration query
    await this.loggerService.log({
      serviceName: 'MY_GOV_UZ',
      direction: IntegrationDirection.INBOUND,
      status: IntegrationStatus.SUCCESS,
      endpoint: '/external/mygov/mediators',
      request: query,
      response: { total, returnedCount: entries.length },
      durationMs: Date.now() - startTime,
    });

    return result;
  }

  async pushRegistryEntry(payload: Prisma.InputJsonValue) {
    const endpoint = process.env.MYGOV_API_URL;
    if (!endpoint) throw new Error('MYGOV_API_URL sozlanmagan');

    return this.loggerService.executeWithResilience(
      async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.MYGOV_API_TOKEN
              ? { authorization: `Bearer ${process.env.MYGOV_API_TOKEN}` }
              : {}),
          },
          body: JSON.stringify(payload),
        });
        const responseBody = await response.text();
        if (!response.ok) {
          throw new Error(`my.gov.uz javobi ${response.status}: ${responseBody.slice(0, 500)}`);
        }
        return responseBody ? JSON.parse(responseBody) : { accepted: true };
      },
      {
        serviceName: 'MY_GOV_UZ',
        endpoint,
        direction: IntegrationDirection.OUTBOUND,
        timeoutMs: 5000,
        maxRetries: 2,
      },
      payload,
    );
  }
}
