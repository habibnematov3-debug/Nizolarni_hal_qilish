import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OptionalReportPeriodDto } from './report-period.dto';

export enum ReportExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ExportAnalyticsDto extends OptionalReportPeriodDto {
  @ApiPropertyOptional({ enum: ReportExportFormat, default: ReportExportFormat.EXCEL })
  @IsEnum(ReportExportFormat)
  format: ReportExportFormat = ReportExportFormat.EXCEL;
}
