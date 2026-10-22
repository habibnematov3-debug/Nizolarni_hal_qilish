import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateReportDto {
  @ApiProperty({
    type: Object,
    example: { mediationSessions: 12, resolvedCases: 8, notes: 'Chorak yakuni' },
    description: 'Mediator kiritadigan qo\'shimcha statistik ma\'lumotlar',
  })
  @IsObject()
  additionalData: Record<string, unknown>;
}
