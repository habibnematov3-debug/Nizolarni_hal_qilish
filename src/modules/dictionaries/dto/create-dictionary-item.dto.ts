import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDictionaryItemDto {
  @ApiProperty({ example: 'TOSHKENT_SH', description: 'Qiymatning unikal kodi' })
  @IsNotEmpty({ message: 'Kod kiritilishi shart' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Toshkent shahri', description: 'Nomi (o\'zbek tilida)' })
  @IsNotEmpty({ message: 'O\'zbekcha nom kiritilishi shart' })
  @IsString()
  nameUz: string;

  @ApiPropertyOptional({ example: 'г. Ташкент', description: 'Nomi (rus tilida)' })
  @IsOptional()
  @IsString()
  nameRu?: string;

  @ApiPropertyOptional({ example: 'Tashkent city', description: 'Nomi (ingliz tilida)' })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Tavsif' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'Tartib raqami' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true, description: 'Faollik holati' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: { extraField: 'value' },
    description: 'Qo\'shimcha parametrlar yoki shablon ma\'lumotlari (JSON)',
  })
  @IsOptional()
  metadata?: any;
}
