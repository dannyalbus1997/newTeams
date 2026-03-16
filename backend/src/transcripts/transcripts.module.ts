import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TranscriptsService } from './transcripts.service';
import { TranscriptsController } from './transcripts.controller';
import { Transcript, TranscriptSchema } from './schemas/transcript.schema';
import { UsersModule } from '@/users/users.module';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transcript.name, schema: TranscriptSchema },
    ]),
    UsersModule,
  ],
  providers: [TranscriptsService, MicrosoftGraphService],
  controllers: [TranscriptsController],
  exports: [TranscriptsService],
})
export class TranscriptsModule {}
