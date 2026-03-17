import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Sse,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable, fromEvent, map } from 'rxjs';
import { MeetingBotService } from './meeting-bot.service';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '@/common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

@ApiTags('meeting-bot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meeting-bot')
export class MeetingBotController {
  constructor(private readonly meetingBotService: MeetingBotService) {}

  // ─── Join a Meeting ──────────────────────────────────────────────────

  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send the bot to join a Teams meeting and start recording',
    description:
      'Provide a Teams meeting join URL and the bot will join as a participant, ' +
      'record the audio, and (when the meeting ends) automatically transcribe with ' +
      'Whisper and summarize with GPT-4o.',
  })
  @ApiResponse({ status: 201, description: 'Bot is joining the meeting' })
  @ApiResponse({ status: 400, description: 'Invalid join URL or bot already active' })
  async joinMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinMeetingDto,
  ) {
    if (!dto.joinUrl) {
      throw new BadRequestException('A Teams meeting join URL is required');
    }

    const session = await this.meetingBotService.joinMeeting(
      user.sub,
      dto.joinUrl,
      {
        botDisplayName: dto.botDisplayName,
        meetingId: dto.meetingId,
        autoTranscribe: dto.autoTranscribe ?? true,
        autoSummarize: dto.autoSummarize ?? true,
      },
    );

    return {
      sessionId: (session as any)._id,
      status: session.status,
      message: 'Bot is joining the meeting. Use the session ID to track progress.',
      joinUrl: session.joinUrl,
    };
  }

  // ─── Stop Recording & Leave ──────────────────────────────────────────

  @Post(':sessionId/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stop the bot — leaves the meeting and starts transcription pipeline',
    description:
      'The bot will leave the meeting, download the recording, transcribe with ' +
      'Whisper, and summarize with GPT-4o. Returns immediately; use the status ' +
      'endpoint or SSE stream to track progress.',
  })
  @ApiQuery({
    name: 'transcribe',
    required: false,
    type: Boolean,
    description: 'Auto-transcribe after stopping (default: true)',
  })
  @ApiQuery({
    name: 'summarize',
    required: false,
    type: Boolean,
    description: 'Auto-summarize after transcription (default: true)',
  })
  @ApiResponse({ status: 200, description: 'Bot is leaving and processing' })
  async stopSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseObjectIdPipe) sessionId: string,
    @Query('transcribe') transcribe?: string,
    @Query('summarize') summarize?: string,
  ) {
    const autoTranscribe = transcribe !== 'false';
    const autoSummarize = summarize !== 'false';

    const session = await this.meetingBotService.stopSession(
      user.sub,
      sessionId,
      autoTranscribe,
      autoSummarize,
    );

    return {
      sessionId: (session as any)._id,
      status: session.status,
      message: 'Bot is leaving the meeting and starting post-processing.',
    };
  }

  // ─── Cancel (no processing) ──────────────────────────────────────────

  @Post(':sessionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel the bot session — leaves without processing',
    description: 'The bot leaves the meeting and discards any recording. No transcription or summary is generated.',
  })
  @ApiResponse({ status: 200, description: 'Bot session cancelled' })
  async cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseObjectIdPipe) sessionId: string,
  ) {
    const session = await this.meetingBotService.cancelSession(user.sub, sessionId);
    return {
      sessionId: (session as any)._id,
      status: session.status,
      message: 'Bot session cancelled.',
    };
  }

  // ─── Session Status ──────────────────────────────────────────────────

  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the current status of a bot session',
    description: 'Returns full session details including status, progress, and any errors.',
  })
  @ApiResponse({ status: 200, description: 'Session status retrieved' })
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseObjectIdPipe) sessionId: string,
  ) {
    const session = await this.meetingBotService.getSession(user.sub, sessionId);
    if (!session) {
      throw new BadRequestException('Bot session not found');
    }
    return session;
  }

  // ─── Active Sessions ─────────────────────────────────────────────────

  @Get('active/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all currently active bot sessions',
    description: 'Returns sessions that are initializing, joined, recording, or processing.',
  })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  async getActiveSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.meetingBotService.getActiveSessions(user.sub);
    return { sessions, count: sessions.length };
  }

  // ─── Session History ──────────────────────────────────────────────────

  @Get('history/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List bot session history with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Session history retrieved' })
  async getSessionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.meetingBotService.getSessionHistory(
      user.sub,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  // ─── Real-time Progress (SSE) ─────────────────────────────────────────

  @Sse(':sessionId/stream')
  @ApiOperation({
    summary: 'Stream real-time progress updates via Server-Sent Events',
    description:
      'Connect to this endpoint to receive live updates as the bot joins, records, ' +
      'transcribes, and summarizes. Events are sent as JSON with status, progress, and message fields.',
  })
  streamSessionUpdates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Observable<MessageEvent> {
    return fromEvent(this.meetingBotService.events, 'session-update').pipe(
      // Filter to only this session's updates
      map((event: any) => {
        if (event.sessionId === sessionId) {
          return {
            data: JSON.stringify({
              sessionId: event.sessionId,
              status: event.status,
              progressPercent: event.progressPercent,
              progressMessage: event.progressMessage,
              errorMessage: event.errorMessage,
            }),
          } as MessageEvent;
        }
        return undefined as any;
      }),
    );
  }

  // ─── Graph Webhook Callback (unauthenticated) ─────────────────────────

  /**
   * This endpoint receives call state notifications from Microsoft Graph.
   * It must be publicly accessible and does NOT use JWT auth.
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Microsoft Graph call notification callback (internal)',
    description: 'Receives call state change notifications from Microsoft Graph. Not intended for direct use.',
  })
  async handleCallback(@Body() body: any) {
    // Handle validation token for subscription registration
    if (body?.validationToken) {
      return body.validationToken;
    }

    // Process notifications
    const notifications = body?.value || [body];
    for (const notification of notifications) {
      await this.meetingBotService.handleCallNotification(notification);
    }

    return { status: 'ok' };
  }
}
