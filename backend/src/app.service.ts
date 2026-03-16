import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'Teams Meeting Summary API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
