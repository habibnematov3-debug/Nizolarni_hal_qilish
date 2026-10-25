import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController, PublicContentController } from './content.controller';

@Module({
  providers: [ContentService],
  controllers: [ContentController, PublicContentController],
  exports: [ContentService],
})
export class ContentModule {}
