import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import { RecordingsService } from './recordings.service';
import { MeetingsService } from '@/meetings/meetings.service';
import { UsersService } from '@/users/users.service';
import { AuthService } from '@/auth/auth.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

@ApiTags('recordings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recordings')
export class RecordingsController {
  private readonly logger = new Logger(RecordingsController.name);

  constructor(
    private readonly recordingsService: RecordingsService,
    private readonly meetingsService: MeetingsService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly microsoftGraphService: MicrosoftGraphService,
  ) {}

  @Get(':meetingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List available recordings for a meeting' })
  @ApiResponse({ status: 200, description: 'Recordings list' })
  async getRecordings(
    @CurrentUser() authUser: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
  ) {
    const user = await this.usersService.findById(authUser.sub);
    if (!user) throw new BadRequestException('User not found');

    const meeting = await this.meetingsService.getMeetingById(authUser.sub, meetingId);
    let microsoftMeetingId = meeting.microsoftMeetingId;

    // Resolve calendar event ID (AAMk...) to real online meeting ID if needed
    if (microsoftMeetingId.startsWith('AAMk') && meeting.joinUrl) {
      const appToken = await this.authService.getAppAccessToken();
      const resolved = await this.microsoftGraphService.getOnlineMeetingIdByJoinUrl(
        appToken,
        meeting.joinUrl,
      );
      if (resolved) {
        microsoftMeetingId = resolved;
        this.logger.log(`Resolved meeting ID from joinUrl: ${resolved}`);
      }
    }

    const appToken = await this.authService.getAppAccessToken();
    const recordings = await this.recordingsService.getRecordings(
      appToken,
      microsoftMeetingId,
      user.microsoftId,
    );

    // Update hasRecording flag if it was stale
    if (recordings.length > 0 && !meeting.hasRecording) {
      try {
        await this.meetingsService.updateMeetingRecordingFlag(authUser.sub, meetingId, true);
      } catch {
        // non-critical — ignore
      }
    }

    return { recordings };
  }

  @Get(':meetingId/stream')
  @ApiOperation({ summary: 'Stream the first recording for a meeting (video/mp4)' })
  @ApiResponse({ status: 200, description: 'Recording stream' })
  async streamRecording(
    @CurrentUser() authUser: AuthenticatedUser,
    @Param('meetingId', ParseObjectIdPipe) meetingId: string,
    @Res() res: Response,
  ) {
    const user = await this.usersService.findById(authUser.sub);
    if (!user) throw new BadRequestException('User not found');

    const meeting = await this.meetingsService.getMeetingById(authUser.sub, meetingId);
    let microsoftMeetingId = meeting.microsoftMeetingId;
    const appToken = await this.authService.getAppAccessToken();

    // Resolve calendar event ID (AAMk...) to real online meeting ID if needed
    if (microsoftMeetingId.startsWith('AAMk') && meeting.joinUrl) {
      const resolved = await this.microsoftGraphService.getOnlineMeetingIdByJoinUrl(
        appToken,
        meeting.joinUrl,
      );
      if (resolved) microsoftMeetingId = resolved;
    }

    const recording = await this.recordingsService.downloadFirstRecording(
      appToken,
      microsoftMeetingId,
      user.microsoftId,
    );

    if (!recording) {
      throw new BadRequestException('No recording available for this meeting');
    }

    try {
      res.setHeader('Content-Type', recording.mimeType);
      res.setHeader('Content-Length', recording.size);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${meeting.subject.replace(/[^a-zA-Z0-9 ]/g, '')}.mp4"`,
      );

      const fs = await import('fs');
      const stream = fs.createReadStream(recording.filePath);
      stream.pipe(res);

      stream.on('end', () => {
        this.recordingsService.cleanupRecording(recording.filePath);
      });

      stream.on('error', (err) => {
        this.logger.error('Stream error', err);
        this.recordingsService.cleanupRecording(recording.filePath);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to stream recording' });
        }
      });
    } catch (error) {
      await this.recordingsService.cleanupRecording(recording.filePath);
      throw error;
    }
  }
}
