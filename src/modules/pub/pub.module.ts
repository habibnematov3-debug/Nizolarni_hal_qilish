import { Module } from '@nestjs/common';
import { PubController } from './pub.controller';
import { PubService } from './pub.service';
import { ContentModule } from '../content/content.module';

@Module({ imports: [ContentModule], controllers: [PubController], providers: [PubService] })
export class PubModule {}
