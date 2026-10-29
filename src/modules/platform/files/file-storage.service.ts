import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { FileAccessLevel } from './dto/file-upload.dto';

/**
 * Fayl yozuvi interfeysi (DB modelidan)
 */
export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  accessLevel: string;
  uploadedById: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fayl saqlash xizmati interfeysi
 */
export interface IFileStorageService {
  upload(
    file: Express.Multer.File,
    userId: string,
    accessLevel: FileAccessLevel,
    description?: string,
  ): Promise<FileRecord>;
  download(fileId: string, userId: string): Promise<Buffer>;
  delete(fileId: string, userId: string): Promise<void>;
  checkAccess(fileId: string, userId: string): Promise<boolean>;
}

/**
 * Qo'llab-quvvatlangan MIME turlar va ularning magic bytes
 */
const ALLOWED_TYPES: Record<string, { mime: string; magic: Buffer; maxMB: number }> = {
  pdf: { mime: 'application/pdf', magic: Buffer.from([0x25, 0x50, 0x44, 0x46]), maxMB: 10 },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    maxMB: 10,
  },
  jpg: { mime: 'image/jpeg', magic: Buffer.from([0xff, 0xd8, 0xff]), maxMB: 5 },
  png: {
    mime: 'image/png',
    magic: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    maxMB: 5,
  },
  mp4: { mime: 'video/mp4', magic: Buffer.from([0x00, 0x00, 0x00]), maxMB: 100 },
};

/**
 * Fayl Saqlash Xizmati
 *
 * Qo'llab-quvvatlangan formatlar: PDF, DOCX, JPG, PNG, MP4
 * Maksimal hajm: hujjat 10MB, rasm 5MB, video 100MB
 * Fayl turi magic bytes orqali tekshiriladi
 */
@Injectable()
export class FileStorageService implements IFileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = process.env.FILE_UPLOAD_PATH || './uploads';
    this.ensureUploadDir();
  }

  /**
   * Fayl yuklash
   * @param file - Multer fayl ob'ekti
   * @param userId - Yuklagan foydalanuvchi ID
   * @param accessLevel - Kirish darajasi
   * @param description - Fayl tavsifi (ixtiyoriy)
   */
  async upload(
    file: Express.Multer.File,
    userId: string,
    accessLevel: FileAccessLevel = FileAccessLevel.PRIVATE,
    description?: string,
  ): Promise<FileRecord> {
    // Fayl turi va hajmini tekshirish
    await this.validateFile(file);

    // Noyob fayl nomi generatsiya
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadDir, storedName);

    // Faylni diskka yozish
    await fs.promises.writeFile(filePath, file.buffer);

    // DB ga yozish
    const record = await (this.prisma as any).fileRecord.create({
      data: {
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath,
        accessLevel,
        uploadedById: userId,
        description: description ?? null,
      },
    });

    this.logger.log(`Fayl yuklandi: ${record.id} (${file.size} bytes)`);
    return record as FileRecord;
  }

  /**
   * Faylni yuklab olish
   * @param fileId - Fayl ID
   * @param userId - So'rovchi foydalanuvchi ID
   */
  async download(fileId: string, userId: string): Promise<Buffer> {
    const record = await this.getFileRecord(fileId);

    // Kirish huquqini tekshirish
    const hasAccess = await this.checkAccess(fileId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Bu faylga kirish huquqingiz yo\'q');
    }

    // Faylni diskdan o'qish
    try {
      const buffer = await fs.promises.readFile(record.filePath);
      this.logger.log(`Fayl olindi: ${fileId} — Foydalanuvchi: ${userId}`);
      return buffer;
    } catch {
      throw new NotFoundException('Fayl diskda topilmadi');
    }
  }

  /**
   * Faylni o'chirish
   * @param fileId - Fayl ID
   * @param userId - O'chiruvchi foydalanuvchi ID
   */
  async delete(fileId: string, userId: string): Promise<void> {
    const record = await this.getFileRecord(fileId);

    // Faqat fayl egasi o'chira oladi
    if (record.uploadedById !== userId) {
      throw new ForbiddenException('Faqat fayl egasi o\'chira oladi');
    }

    // Diskdan o'chirish
    try {
      await fs.promises.unlink(record.filePath);
    } catch {
      this.logger.warn(`Fayl diskda topilmadi, faqat DB dan o'chiriladi: ${fileId}`);
    }

    // DB dan o'chirish
    await (this.prisma as any).fileRecord.delete({ where: { id: fileId } });

    this.logger.log(`Fayl o'chirildi: ${fileId} — Foydalanuvchi: ${userId}`);
  }

  /**
   * Faylga kirish huquqini tekshirish
   * @param fileId - Fayl ID
   * @param userId - Tekshirilayotgan foydalanuvchi ID
   */
  async checkAccess(fileId: string, userId: string): Promise<boolean> {
    const record = await this.getFileRecord(fileId);

    // Public fayllar hamma uchun ochiq
    if (record.accessLevel === FileAccessLevel.PUBLIC) {
      return true;
    }

    // Fayl egasi har doim kira oladi
    if (record.uploadedById === userId) {
      return true;
    }

    // Private chat attachments are readable by the other participant in that chat.
    const attachedMessages = await this.prisma.medMessage.findMany({
      where: {
        senderId: record.uploadedById,
        attachmentIds: { array_contains: [fileId] },
      },
      select: { conversation: { select: { participantA: true, participantB: true } } },
    });
    if (attachedMessages.some(({ conversation }) => conversation.participantA === userId || conversation.participantB === userId)) {
      return true;
    }

    // Private attachments become readable to explicitly listed document-exchange participants.
    // Office-wide access is limited to regional/ministry staff in the participating organization.
    if (record.accessLevel === FileAccessLevel.PRIVATE) {
      const organizationDocument = await (this.prisma as any).businessAuthorityDocument.findFirst({
        where: { fileId, organization: { businessMembers: { some: { userId } } } },
        select: { id: true },
      });
      if (organizationDocument) return true;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true, userRoles: { select: { role: { select: { name: true } } } } },
      });
      const hasOfficeRole = user?.userRoles.some(({ role }) => ['REGIONAL_STAFF', 'MINISTRY_STAFF'].includes(role.name));
      const participantAccess = [
        { userId },
        ...(hasOfficeRole && user?.organizationId ? [{ organizationId: user.organizationId }] : []),
      ];
      const sharedAttachment = await (this.prisma as any).documentExchangeAttachment.findFirst({
        where: {
          fileId,
          message: { thread: { participants: { some: { OR: participantAccess } } } },
        },
        select: { id: true },
      });
      if (sharedAttachment) return true;
    }

    // Internal — tizim foydalanuvchilari uchun
    if (record.accessLevel === FileAccessLevel.INTERNAL) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      return user?.status === 'ACTIVE';
    }

    return false;
  }

  /**
   * Fayl yozuvini DB dan olish
   */
  private async getFileRecord(fileId: string): Promise<FileRecord> {
    const record = await (this.prisma as any).fileRecord.findUnique({
      where: { id: fileId },
    });

    if (!record) {
      throw new NotFoundException(`Fayl topilmadi: ${fileId}`);
    }

    return record as FileRecord;
  }

  /**
   * Fayl turini va hajmini tekshirish (magic bytes orqali)
   */
  private async validateFile(file: Express.Multer.File): Promise<void> {
    if (!file?.buffer?.length) throw new BadRequestException('Yuklanadigan fayl tanlanmagan yoki bo‘sh');
    const allowedMimes = Object.values(ALLOWED_TYPES).map((t) => t.mime);

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Qo'llab-quvvatlanmagan fayl turi: ${file.mimetype}. ` +
          `Ruxsat berilganlar: PDF, DOCX, JPG, PNG, MP4`,
      );
    }

    // Magic bytes tekshirish
    const isValidMagic = this.validateMagicBytes(file.buffer, file.mimetype);
    if (!isValidMagic) {
      throw new BadRequestException(
        'Fayl turi mos emas. Fayl kengaytmasi va haqiqiy turi farq qilmoqda.',
      );
    }

    // Hajm tekshirish
    const typeConfig = Object.values(ALLOWED_TYPES).find((t) => t.mime === file.mimetype);
    if (typeConfig) {
      const maxBytes = typeConfig.maxMB * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new BadRequestException(
          `Fayl juda katta. Maksimal hajm: ${typeConfig.maxMB}MB. Hozirgi: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        );
      }
    }
  }

  /**
   * Magic bytes tekshirish
   */
  private validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
    for (const typeConfig of Object.values(ALLOWED_TYPES)) {
      if (typeConfig.mime === mimetype) {
        const magic = typeConfig.magic;
        const fileStart = buffer.slice(0, magic.length);
        // MP4 uchun maxsus tekshirish (magic bytes pozitsiyasi farq qiladi)
        if (mimetype === 'video/mp4') return true;
        return fileStart.equals(magic);
      }
    }
    return false;
  }

  /**
   * Upload papkasini yaratish
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Upload papkasi yaratildi: ${this.uploadDir}`);
    }
  }
}
