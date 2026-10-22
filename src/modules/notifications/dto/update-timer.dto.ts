import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimerUnit } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTimerDto {
  @ApiPropertyOptional({ example: 5, description: 'Taymer muddati qiymati (masalan: 3, 5, 30)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationValue?: number;

  @ApiPropertyOptional({ enum: TimerUnit, example: TimerUnit.DAYS, description: 'Muddat birligi: MINUTES, HOURS, DAYS, MONTHS' })
  @IsOptional()
  @IsEnum(TimerUnit)
  durationUnit?: TimerUnit;

  @ApiPropertyOptional({ example: 'Arizani ko\'rib chiqish va ro\'yxatga olish muddati', description: 'Tavsif' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Taymer faollik holati' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
