import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ example: 'Ariza holati haqida bildirishnoma', description: 'Shablon nomi' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Sizning arizangiz qabul qilindi', description: 'Sarlavha (UZ)' })
  @IsOptional()
  @IsString()
  titleUz?: string;

  @ApiPropertyOptional({ example: 'Ваше заявление принято', description: 'Sarlavha (RU)' })
  @IsOptional()
  @IsString()
  titleRu?: string;

  @ApiPropertyOptional({
    example: 'Hurmatli {{fullName}}, sizning {{caseNumber}}-sonli arizangiz qabul qilindi.',
    description: 'Xabar matni (UZ). {{variable}} o\'zgaruvchilarni qo\'llab-quvvatlaydi.',
  })
  @IsOptional()
  @IsString()
  bodyUz?: string;

  @ApiPropertyOptional({
    example: 'Уважаемый(ая) {{fullName}}, ваше заявление №{{caseNumber}} принято.',
    description: 'Xabar matni (RU)',
  })
  @IsOptional()
  @IsString()
  bodyRu?: string;

  @ApiPropertyOptional({
    example: 'Ariza {{caseNumber}} qabul qilindi. Tafsilotlar: platforma.adliya.uz',
    description: 'SMS matni shabloni (UZ)',
  })
  @IsOptional()
  @IsString()
  smsTextUz?: string;

  @ApiPropertyOptional({ description: 'SMS matni shabloni (RU)' })
  @IsOptional()
  @IsString()
  smsTextRu?: string;

  @ApiPropertyOptional({ example: ['fullName', 'caseNumber', 'deadline'], description: 'Mavjud o\'zgaruvchilar ro\'yxati' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableVariables?: string[];

  @ApiPropertyOptional({ example: true, description: 'Shablon faollik holati' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
