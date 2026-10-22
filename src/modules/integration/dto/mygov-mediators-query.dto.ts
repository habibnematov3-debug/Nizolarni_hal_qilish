import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class MyGovMediatorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'Toshkent shahri', description: 'Hudud bo\'yicha filtr' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'CIVIL', description: 'Ixtisoslik kodi bo\'yicha filtr (CIVIL, FAMILY, LABOR, ECONOMIC)' })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Holat bo\'yicha filtr (ACTIVE, INACTIVE)' })
  @IsOptional()
  @IsString()
  status?: string;
}
