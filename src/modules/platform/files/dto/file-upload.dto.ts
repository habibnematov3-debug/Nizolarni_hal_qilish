import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * Fayl kirish darajasi
 */
export enum FileAccessLevel {
  /** Faqat yuklagan foydalanuvchi */
  PRIVATE = 'PRIVATE',
  /** Tizim foydalanuvchilari */
  INTERNAL = 'INTERNAL',
  /** Hamma (public) */
  PUBLIC = 'PUBLIC',
}

/**
 * Fayl yuklash DTO
 */
export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Yuklanadigan fayl (PDF, DOCX, JPG, PNG, MP4)',
  })
  file: Express.Multer.File;

  @ApiProperty({
    enum: FileAccessLevel,
    default: FileAccessLevel.PRIVATE,
    description: 'Fayl kirish darajasi',
  })
  @IsEnum(FileAccessLevel)
  @IsOptional()
  accessLevel?: FileAccessLevel = FileAccessLevel.PRIVATE;

  @ApiProperty({
    required: false,
    description: 'Fayl tavsifi',
    example: 'Shartnoma hujjati',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * Fayl yozuvi DTO (javob uchun)
 */
export class FileRecordDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'shartnoma.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 1048576, description: 'Fayl hajmi (bytes)' })
  sizeBytes: number;

  @ApiProperty({ enum: FileAccessLevel })
  accessLevel: FileAccessLevel;

  @ApiProperty({ example: 'uuid', description: 'Yuklagan foydalanuvchi ID' })
  uploadedById: string;

  @ApiProperty({ example: '2026-10-22T18:00:00Z' })
  createdAt: string;
}
