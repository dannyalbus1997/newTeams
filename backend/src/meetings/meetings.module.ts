import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting, MeetingSchema } from './schemas/meeting.schema';
import { UsersModule } from '@/users/users.module';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Meeting.name, schema: MeetingSchema }]),
    UsersModule,
  ],
  providers: [MeetingsService, MicrosoftGraphService],
  controllers: [MeetingsController],
  exports: [MeetingsService],
})
export class MeetingsModule {}
