import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SummariesService } from './summaries.service';
import { SummariesController } from './summaries.controller';
import { Summary, SummarySchema } from './schemas/summary.schema';
import { TranscriptsModule } from '@/transcripts/transcripts.module';
import { MeetingsModule } from '@/meetings/meetings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
    TranscriptsModule,
    MeetingsModule,
  ],
  providers: [SummariesService],
  controllers: [SummariesController],
  exports: [SummariesService],
})
export class SummariesModule {}
