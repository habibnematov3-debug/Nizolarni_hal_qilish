import { Module } from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';
import { DictionariesController } from './dictionaries.controller';

@Module({
  providers: [DictionariesService],
  controllers: [DictionariesController],
  exports: [DictionariesService],
})
export class DictionariesModule {}
