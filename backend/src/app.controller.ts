import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        service: 'Teams Meeting Summary API',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'API root' })
  @ApiResponse({
    status: 200,
    description: 'API information',
    schema: {
      example: {
        message: 'Teams Meeting Summary API',
        version: '1.0.0',
      },
    },
  })
  root() {
    return {
      message: 'Teams Meeting Summary API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        users: '/api/users',
        meetings: '/api/meetings',
        transcripts: '/api/transcripts',
        summaries: '/api/summaries',
      },
    };
  }
}
