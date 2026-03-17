import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { MeetingsModule } from '@/meetings/meetings.module';
import { TranscriptsModule } from '@/transcripts/transcripts.module';
import { SummariesModule } from '@/summaries/summaries.module';
import { MeetingBotModule } from '@/meeting-bot/meeting-bot.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    MeetingsModule,
    TranscriptsModule,
    SummariesModule,
    MeetingBotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
