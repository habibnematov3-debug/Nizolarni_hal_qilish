import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ example: 'Platforma sinov tariqasida ishga tushirildi', description: 'Sarlavha (o\'zbek tilida)' })
  @IsNotEmpty({ message: 'O\'zbekcha sarlavha kiritilishi shart' })
  @IsString()
  titleUz: string;

  @ApiPropertyOptional({ example: 'Платформа запущена в тестовом режиме', description: 'Sarlavha (rus tilida)' })
  @IsOptional()
  @IsString()
  titleRu?: string;

  @ApiPropertyOptional({ example: 'Platform launched in test mode', description: 'Sarlavha (ingliz tilida)' })
  @IsOptional()
  @IsString()
  titleEn?: string;

  @ApiPropertyOptional({ example: 'Platformaning asosiy imkoniyatlari haqida qisqacha ma\'lumot', description: 'Qisqacha mazmun (uz)' })
  @IsOptional()
  @IsString()
  summaryUz?: string;

  @ApiPropertyOptional({ description: 'Qisqacha mazmun (ru)' })
  @IsOptional()
  @IsString()
  summaryRu?: string;

  @ApiPropertyOptional({ description: 'Qisqacha mazmun (en)' })
  @IsOptional()
  @IsString()
  summaryEn?: string;

  @ApiPropertyOptional({ example: '<p>Tafsilotlar...</p>', description: 'To\'liq matn / maqola (uz)' })
  @IsOptional()
  @IsString()
  bodyUz?: string;

  @ApiPropertyOptional({ description: 'To\'liq matn (ru)' })
  @IsOptional()
  @IsString()
  bodyRu?: string;

  @ApiPropertyOptional({ description: 'To\'liq matn (en)' })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional({ example: 'https://example.com/files/sample.pdf', description: 'Biriktirilgan fayl havolasi' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/watch?v=sample', description: 'Video qo\'llanma havolasi' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT, description: 'Holat' })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Nashr qilish sanasi' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'Qo\'shimcha parametrlar (masalan: FAQ savol-javobi, teglar, normativ-huquqiy hujjat raqami)' })
  @IsOptional()
  metadata?: any;
}
