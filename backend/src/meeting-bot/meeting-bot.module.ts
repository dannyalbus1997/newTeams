import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MeetingBotService } from './meeting-bot.service';
import { MeetingBotController } from './meeting-bot.controller';
import { BotSession, BotSessionSchema } from './schemas/bot-session.schema';
import { UsersModule } from '@/users/users.module';
import { MeetingsModule } from '@/meetings/meetings.module';
import { TranscriptsModule } from '@/transcripts/transcripts.module';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotSession.name, schema: BotSessionSchema },
    ]),
    ConfigModule,
    UsersModule,
    MeetingsModule,
    TranscriptsModule,
  ],
  providers: [MeetingBotService, MicrosoftGraphService],
  controllers: [MeetingBotController],
  exports: [MeetingBotService],
})
export class MeetingBotModule {}
