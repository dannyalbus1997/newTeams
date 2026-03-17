import { Module } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@Module({
  providers: [RecordingsService, MicrosoftGraphService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
