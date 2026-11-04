import { BadRequestException } from '@nestjs/common';
import { WorkExperienceDto } from './dto/mk.dto';

export function validateCalendarDate(value: string, label: string, today = new Date().toISOString().slice(0, 10)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value || value > today) {
    throw new BadRequestException(`${label}: haqiqiy, kelajakda bo‘lmagan sanani kiriting`);
  }
}

export function normalizeWorkExperience(rows: WorkExperienceDto[] = [], birthDate?: string) {
  if (rows.length > 30) throw new BadRequestException('Ish staji ko‘pi bilan 30 qatordan iborat bo‘lishi mumkin');
  return rows.map((row, index) => {
    const label = `Ish staji, ${index + 1}-qator`;
    validateCalendarDate(row.startedAt || '', `${label}, ishga kirish sanasi`);
    if (!row.workplace?.trim() || !row.position?.trim()) throw new BadRequestException(`${label}: ish joyi va lavozimni to‘ldiring`);
    if (birthDate && row.startedAt < birthDate) throw new BadRequestException(`${label}: ishga kirish sanasi tug‘ilgan sanadan oldin bo‘lishi mumkin emas`);
    if (row.isCurrent && row.endedAt) throw new BadRequestException(`${label}: amaldagi ish uchun ishdan ketish sanasini olib tashlang`);
    if (!row.isCurrent) {
      validateCalendarDate(row.endedAt || '', `${label}, ishdan ketish sanasi`);
      if (row.endedAt < row.startedAt) throw new BadRequestException(`${label}: ishdan ketish sanasi ishga kirish sanasidan oldin bo‘lishi mumkin emas`);
    }
    return { startedAt: row.startedAt, endedAt: row.isCurrent ? null : row.endedAt, isCurrent: row.isCurrent === true, workplace: row.workplace.trim(), position: row.position.trim() };
  });
}
