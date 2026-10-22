import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'NewSecret@2026', description: 'Yangi parol (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
