import { RegistryEntryStatus, RegistryType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class RegistryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RegistryType })
  @IsOptional()
  @IsEnum(RegistryType)
  type?: RegistryType;

  @ApiPropertyOptional({ enum: RegistryEntryStatus })
  @IsOptional()
  @IsEnum(RegistryEntryStatus)
  status?: RegistryEntryStatus;

  @ApiPropertyOptional({ example: 'Toshkent shahri' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'FAMILY' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ example: 'FEMALE' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ minimum: 18, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  ageMin?: number;

  @ApiPropertyOptional({ minimum: 18, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  @Max(100)
  ageMax?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  registeredYear?: number;
}

export class PublicRegistryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RegistryType, description: 'Standart bo\'yicha MEDIATOR' })
  @IsOptional()
  @IsEnum(RegistryType)
  type?: RegistryType;

  @ApiPropertyOptional({ example: 'Toshkent shahri' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'FAMILY' })
  @IsOptional()
  @IsString()
  specialization?: string;
}
