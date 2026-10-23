import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RatingMethodologyDto {
  @ApiProperty({ minimum: 0, maximum: 100, description: 'Tasdiqlangan choraklik hisobotlar ulushi vazni' })
  @IsInt() @Min(0) @Max(100) reportComplianceWeight: number;

  @ApiProperty({ minimum: 0, maximum: 100, description: 'Yakunlangan mediatsiyalar orasida kelishuv bilan tugaganlar ulushi vazni' })
  @IsInt() @Min(0) @Max(100) resolutionRateWeight: number;

  @ApiProperty({ minimum: 0, maximum: 100, description: 'Monitoring majburiyatlari bajarilgan ulushi vazni' })
  @IsInt() @Min(0) @Max(100) agreementExecutionWeight: number;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
