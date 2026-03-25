import { Module, forwardRef } from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { RecordingsController } from './recordings.controller';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { MeetingsModule } from '@/meetings/meetings.module';
import { UsersModule } from '@/users/users.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    forwardRef(() => MeetingsModule),
    UsersModule,
    AuthModule,
  ],
  providers: [RecordingsService, MicrosoftGraphService],
  controllers: [RecordingsController],
  exports: [RecordingsService],
})
export class RecordingsModule {}
