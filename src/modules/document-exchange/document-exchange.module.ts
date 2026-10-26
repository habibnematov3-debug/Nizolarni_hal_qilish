import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentExchangeController } from './document-exchange.controller';
import { DocumentExchangeService } from './document-exchange.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DocumentExchangeController],
  providers: [DocumentExchangeService],
})
export class DocumentExchangeModule {}
