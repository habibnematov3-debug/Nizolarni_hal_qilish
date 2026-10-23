import { Module } from '@nestjs/common';
import { TolController } from './tol.controller';
import { TolService } from './tol.service';
import { IntegrationModule } from '../integration/integration.module';

@Module({ imports: [IntegrationModule], controllers: [TolController], providers: [TolService] })
export class TolModule {}
