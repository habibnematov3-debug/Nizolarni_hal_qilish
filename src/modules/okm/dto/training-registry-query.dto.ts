import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class TrainingRegistryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Hudud nomi' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Jins' })
  @IsOptional()
  @IsString()
  gender?: string;
}
