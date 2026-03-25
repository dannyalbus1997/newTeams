import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting, MeetingSchema } from './schemas/meeting.schema';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { TranscriptsModule } from '@/transcripts/transcripts.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Meeting.name, schema: MeetingSchema }]),
    UsersModule,
    AuthModule,
    forwardRef(() => TranscriptsModule),
  ],
  providers: [MeetingsService, MicrosoftGraphService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule {}
