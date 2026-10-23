import { Module } from '@nestjs/common';
import { PublicMediatorRatingController, PublicRatingsController, MinistryRatingsController, RatingCronController } from './rey.controller';
import { ReyService } from './rey.service';

@Module({
  controllers: [PublicRatingsController, PublicMediatorRatingController, MinistryRatingsController, RatingCronController],
  providers: [ReyService],
  exports: [ReyService],
})
export class ReyModule {}
