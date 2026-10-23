import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards, Put, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RatingMethodologyDto } from './dto/rating-methodology.dto';
import { RatingQueryDto } from './dto/rating-query.dto';
import { ReyService } from './rey.service';
import { Request } from 'express';

@ApiTags('REY — Ochiq reyting')
@Controller('public/ratings')
export class PublicRatingsController {
  constructor(private readonly rey: ReyService) {}

  @Get('methodology')
  @ApiOperation({ summary: 'Fuqarolar uchun reyting ko‘rsatkichlari va hisoblash metodikasi' })
  methodology() {
    return this.rey.getMethodology();
  }

  @Get()
  @ApiOperation({ summary: 'Yil, reyestr turi yoki hudud bo‘yicha ochiq reyting' })
  list(@Query() query: RatingQueryDto) {
    return this.rey.listPublic(query);
  }
}

@ApiTags('REY — Reyting metodikasi')
@Controller('public/mediators')
export class PublicMediatorRatingController {
  constructor(private readonly rey: ReyService) {}

  @Get(':id/rating')
  @ApiOperation({ summary: 'Mediator, hakamlik sudyasi yoki arbitr reytingi' })
  get(@Param('id', ParseUUIDPipe) id: string, @Query('periodYear') periodYear?: string) {
    return this.rey.getPublicRating(id, periodYear ? Number(periodYear) : undefined);
  }
}

@ApiTags('REY — Vazirlik metodikasi')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MINISTRY_STAFF')
@Controller('ministry/rating')
export class MinistryRatingsController {
  constructor(private readonly rey: ReyService) {}

  @Get('methodology')
  @ApiOperation({ summary: 'Amaldagi reyting metodikasini ko‘rish' })
  methodology() {
    return this.rey.getMethodology();
  }

  @Put('methodology')
  @ApiOperation({ summary: 'Reyting ko‘rsatkichlari vaznlarini yangilash (yig‘indi 100 bo‘lishi kerak)' })
  updateMethodology(@Body() dto: RatingMethodologyDto, @CurrentUser() user: AuthUser) {
    return this.rey.updateMethodology(dto, user);
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Reytinglarni ko‘rsatilgan yil uchun qayta hisoblash' })
  recalculate(@Query() query: RatingQueryDto, @CurrentUser() user: AuthUser) {
    return this.rey.recalculate(query.periodYear, user);
  }
}

@ApiTags('REY — Reyting jadvali')
@Controller('internal/cron')
export class RatingCronController {
  constructor(private readonly rey: ReyService) {}

  @Get('ratings')
  @ApiOperation({ summary: 'Vercel Cron uchun kunlik reytinglarni hisoblash' })
  recalculate(@Req() request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException();
    }
    return this.rey.recalculate();
  }
}
