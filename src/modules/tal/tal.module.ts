import { Module } from '@nestjs/common';
import { TalController } from './tal.controller';
import { TalService } from './tal.service';

@Module({
  controllers: [TalController],
  providers: [TalService],
})
export class TalModule {}
