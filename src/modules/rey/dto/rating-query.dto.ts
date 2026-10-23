import { RegistryType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RatingQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) periodYear?: number;
  @IsOptional() @IsEnum(RegistryType) type?: RegistryType;
  @IsOptional() @IsString() region?: string;
}
