import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit jurnali (Audit Log)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit-log')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Audit jurnali ro\'yxatini olish',
    description: 'Tizimdagi barcha muhim amallar (yaratish, o\'zgartirish, o\'chirish, kirish) tarixini ko\'rish. Foydalanuvchi, sana, amal turi bo\'yicha filtrlash mumkin.',
  })
  @ApiResponse({ status: 200, description: 'Audit yozuvlari ro\'yxati va sahifalash' })
  async getAuditLogs(@Query() query: QueryAuditDto) {
    return this.auditService.findAll(query);
  }
}
