import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PubService } from './pub.service';
import { PublicContentQueryDto, PublicPreferenceDto } from './dto/pub.dto';

@ApiTags('Ommaviy sayt (PUB)')
@Controller('public')
export class PubController {
  constructor(private readonly service: PubService) {}

  @Get('home') @ApiOperation({ summary: 'Ommaviy sayt bosh sahifasi' })
  home(@Query() query: PublicContentQueryDto) { return this.service.home(query.language); }

  @Get('content/:type') @ApiOperation({ summary: 'Nashr qilingan kontent ro\'yxati' })
  content(@Param('type') type: string, @Query() query: PublicContentQueryDto) { return this.service.listPublished(type, query); }

  @Get('content/:type/:id') @ApiOperation({ summary: 'Nashr qilingan kontent tafsiloti' })
  detail(@Param('type') type: string, @Param('id') id: string) { return this.service.getPublished(type, id); }

  @Get('statistics') @ApiOperation({ summary: 'Reyestrdan avtomatik statistika' })
  statistics() { return this.service.statistics(); }

  @Get('preferences') @ApiOperation({ summary: 'Sayt qulaylik sozlamalari' })
  preferences(@Headers('x-visitor-id') visitorId?: string) { return this.service.getPreferences(visitorId || 'anonymous'); }

  @Patch('preferences') @ApiOperation({ summary: 'Til va maxsus ko\'rinish rejimini saqlash' })
  updatePreferences(@Headers('x-visitor-id') visitorId: string | undefined, @Body() dto: PublicPreferenceDto) { return this.service.updatePreferences(visitorId || 'anonymous', dto); }

  @Get('announcements/active') @ApiOperation({ summary: 'Faol e\'lonlar' })
  announcements() { return this.service.activeAnnouncements(); }

  @Post('announcements/:id/acknowledge') @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT-auth') @ApiOperation({ summary: 'E\'lon bilan tanishdim' })
  acknowledge(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.acknowledge(user, id); }

  @Get('announcements/pending') @UseGuards(JwtAuthGuard) @ApiBearerAuth('JWT-auth') @ApiOperation({ summary: 'Tanishtirilmagan e\'lonlar' })
  pending(@CurrentUser() user: AuthUser) { return this.service.pendingAnnouncements(user); }
}
