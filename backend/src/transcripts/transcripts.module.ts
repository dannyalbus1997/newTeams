import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TranscriptsService } from './transcripts.service';
import { TranscriptsController } from './transcripts.controller';
import { Transcript, TranscriptSchema } from './schemas/transcript.schema';
import { UsersModule } from '@/users/users.module';
import { MeetingsModule } from '@/meetings/meetings.module';
import { RecordingsModule } from '@/recordings/recordings.module';
import { WhisperModule } from '@/whisper/whisper.module';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transcript.name, schema: TranscriptSchema },
    ]),
    ConfigModule,
    UsersModule,
    MeetingsModule,
    RecordingsModule,
    WhisperModule,
  ],
  providers: [TranscriptsService, MicrosoftGraphService],
  controllers: [TranscriptsController],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
