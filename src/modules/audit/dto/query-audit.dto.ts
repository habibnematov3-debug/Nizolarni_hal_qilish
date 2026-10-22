import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Foydalanuvchi ID si bo\'yicha filtr' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Foydalanuvchi nomi bo\'yicha filtr' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Amal turi (masalan: CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, PUBLISH, ROLE_ASSIGN)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Obyekt turi (masalan: ORGANIZATION, USER, ROLE, DICTIONARY, CONTENT, SETTINGS)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Obyekt ID si' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (ISO format: 2026-01-01)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (ISO format: 2026-12-31)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
