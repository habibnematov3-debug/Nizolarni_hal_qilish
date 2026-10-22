import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API service status' })
  getStatus() {
    return {
      service: 'Nizolarni muqobil hal etish platformasi - ADM API',
      status: 'ok',
      apiDocs: '/api/docs',
    };
  }
}
