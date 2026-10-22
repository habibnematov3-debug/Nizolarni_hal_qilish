import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileStorageService } from './file-storage.service';
import { FileUploadDto, FileAccessLevel, FileRecordDto } from './dto/file-upload.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

/**
 * Fayl Saqlash Controller
 * Fayl yuklash, olish va o'chirish endpointlari
 */
@ApiTags('Platform — Fayllar')
@Controller('platform/files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  /**
   * Fayl yuklash (Multipart/form-data)
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // Katta fayllar uchun memory storage (streaming yo'lida)
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB maksimal
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Fayl yuklash',
    description:
      'Fayl yuklash (Multipart). ' +
      'Qo\'llab-quvvatlangan: PDF, DOCX, JPG, PNG, MP4. ' +
      'Hujjat: maks 10MB, Rasm: maks 5MB, Video: maks 100MB',
  })
  @ApiResponse({
    status: 201,
    description: 'Fayl muvaffaqiyatli yuklandi',
    type: FileRecordDto,
  })
  @ApiResponse({ status: 400, description: 'Noto\'g\'ri fayl turi yoki hajmi katta' })
  @ApiResponse({ status: 401, description: 'Avtorizatsiya kerak' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: FileUploadDto,
    @CurrentUser() user: { id: string },
  ): Promise<FileRecordDto> {
    const record = await this.fileStorageService.upload(
      file,
      user.id,
      dto.accessLevel ?? FileAccessLevel.PRIVATE,
      dto.description,
    );

    return {
      id: record.id,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      accessLevel: record.accessLevel as FileAccessLevel,
      uploadedById: record.uploadedById,
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Faylni yuklab olish
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Fayl olish',
    description: 'Fayl ID bo\'yicha faylni yuklab olish. Kirish huquqi tekshiriladi.',
  })
  @ApiParam({ name: 'id', description: 'Fayl UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fayl stream sifatida qaytariladi' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q' })
  @ApiResponse({ status: 404, description: 'Fayl topilmadi' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.fileStorageService.download(id, user.id);

    // Content-Type va Content-Disposition headerlarini o'rnatish
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment`,
    });
    res.send(buffer);
  }

  /**
   * Faylni o'chirish
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Faylni o\'chirish',
    description: 'Faqat fayl egasi o\'chira oladi.',
  })
  @ApiParam({ name: 'id', description: 'Fayl UUID', type: String })
  @ApiResponse({ status: 204, description: 'Fayl muvaffaqiyatli o\'chirildi' })
  @ApiResponse({ status: 403, description: 'Ruxsat yo\'q — faqat egasi o\'chira oladi' })
  @ApiResponse({ status: 404, description: 'Fayl topilmadi' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.fileStorageService.delete(id, user.id);
  }
}
