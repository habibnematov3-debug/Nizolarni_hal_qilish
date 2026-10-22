import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReportPeriodDto {
  @ApiProperty({ example: 2026, description: 'Hisobot yili' })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @ApiProperty({ example: 4, description: 'Chorak: 1, 2, 3 yoki 4' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  quarter: number;
}

export class OptionalReportPeriodDto {
  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({ example: 4 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  quarter?: number;
}
