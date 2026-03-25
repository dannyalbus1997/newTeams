import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

import {
  BotSession,
  BotSessionDocument,
  BotSessionStatus,
} from './schemas/bot-session.schema';
import { UsersService } from '@/users/users.service';
import { MeetingsService } from '@/meetings/meetings.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { TranscriptsService } from '@/transcripts/transcripts.service';
import { AppConfig } from '@/config/configuration';

/**
 * MeetingBotService — manages a Teams bot that joins meetings, records audio,
 * and triggers the Whisper → GPT pipeline once the meeting ends.
 *
 * Architecture:
 * ─────────────
 * 1. User calls POST /meeting-bot/join with a Teams join URL
 * 2. The service creates an Azure Communications call via Microsoft Graph
 *    (application-permission call using the app's own identity)
 * 3. The bot joins as a participant and starts cloud recording
 * 4. When the user calls POST /meeting-bot/:sessionId/stop  OR the meeting
 *    ends naturally (detected via Graph subscription / polling), the bot
 *    leaves and downloads the recording
 * 5. The recording is passed to TranscriptsService.transcribeWithWhisper()
 *    which handles the full Whisper → GPT pipeline
 *
 * Prerequisites (Azure):
 * ─────────────────────
 * - Azure AD app registration with these APPLICATION permissions:
 *     • Calls.JoinGroupCall.All
 *     • Calls.InitiateGroupCall.All
 *     • Calls.AccessMedia.All  (for application-hosted media)
 *     • OnlineMeetings.Read.All
 *   These must be admin-consented in the Azure portal.
 *
 * - A bot channel registration in Azure Bot Service linked to the same app.
 *
 * - An Azure Communication Services resource (or Teams policy-based recording)
 *   for the actual media capture. This service abstracts over both approaches.
 */
@Injectable()
export class MeetingBotService implements OnModuleDestroy {
  private readonly logger = new Logger(MeetingBotService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'meeting-bot-recordings');

  /** Tracks active polling intervals so we can clean them up */
  private readonly pollingIntervals = new Map<string, NodeJS.Timeout>();

  /** EventEmitter for real-time progress updates (consumed by SSE / WebSocket) */
  public readonly events = new EventEmitter();

  constructor(
    @InjectModel(BotSession.name)
    private botSessionModel: Model<BotSessionDocument>,
    private configService: ConfigService<AppConfig>,
    private usersService: UsersService,
    private meetingsService: MeetingsService,
    private microsoftGraphService: MicrosoftGraphService,
    private transcriptsService: TranscriptsService,
  ) {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async onModuleDestroy() {
    // Clean up all polling intervals on shutdown
    for (const [key, interval] of this.pollingIntervals) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
    }
  }

  // ─── App-only Token ──────────────────────────────────────────────────

  /**
   * Acquire an app-only (client credentials) access token for Microsoft Graph.
   * This is required because the bot acts as the APPLICATION, not the user.
   */
  private async getAppAccessToken(): Promise<string> {
    const tenantId = this.configService.get('azure.tenantId', { infer: true }) as string;
    const clientId = this.configService.get('azure.clientId', { infer: true }) as string;
    const clientSecret = this.configService.get('azure.clientSecret', { infer: true }) as string;

    if (!tenantId || !clientId || !clientSecret) {
      throw new BadRequestException(
        'Azure AD credentials are not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.',
      );
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to acquire app token: ${errorText}`);
      throw new BadRequestException(
        'Failed to acquire application access token from Azure AD',
      );
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  /**
   * Build a Graph client authenticated with the app-only token.
   */
  private async getAppGraphClient(): Promise<Client> {
    const token = await this.getAppAccessToken();
    return Client.init({
      authProvider: (done) => done(null, token),
    });
  }

  // ─── Join Meeting ────────────────────────────────────────────────────

  /**
   * Join a Teams meeting by URL.
   *
   * Creates a new call via Microsoft Graph Communications API so the bot
   * appears as a participant. Returns the bot session for tracking.
   */
  async joinMeeting(
    userId: string,
    joinUrl: string,
    options: {
      botDisplayName?: string;
      meetingId?: string;
      autoTranscribe?: boolean;
      autoSummarize?: boolean;
    } = {},
  ): Promise<BotSession> {
    const {
      botDisplayName = 'Meeting Assistant Bot',
      meetingId,
      autoTranscribe = true,
      autoSummarize = true,
    } = options;

    this.logger.log(`Bot joining meeting: ${joinUrl}`);

    // Check for duplicate active session on same meeting URL
    const existingSession = await this.botSessionModel.findOne({
      userId: new Types.ObjectId(userId),
      joinUrl,
      status: {
        $in: [
          BotSessionStatus.INITIALIZING,
          BotSessionStatus.JOINED,
          BotSessionStatus.RECORDING,
        ],
      },
    });

    if (existingSession) {
      throw new BadRequestException(
        'A bot is already active in this meeting. Stop the current session before starting a new one.',
      );
    }

    // Resolve the Teams thread/meeting info from the join URL
    const meetingInfo = this.parseJoinUrl(joinUrl);

    // Create bot session record
    const session = await this.botSessionModel.create({
      userId: new Types.ObjectId(userId),
      meetingId: meetingId ? new Types.ObjectId(meetingId) : undefined,
      microsoftMeetingId: meetingInfo.threadId,
      joinUrl,
      botDisplayName,
      status: BotSessionStatus.INITIALIZING,
      progressMessage: 'Preparing to join meeting...',
      progressPercent: 5,
    });

    // Join asynchronously so the API responds immediately
    this.joinAndRecord(session, autoTranscribe, autoSummarize).catch((error) => {
      this.logger.error(
        `Background join failed for session ${session._id}`,
        error,
      );
    });

    return session;
  }

  /**
   * Background task: join the meeting → start recording → wait → process.
   */
  private async joinAndRecord(
    session: BotSessionDocument,
    autoTranscribe: boolean,
    autoSummarize: boolean,
  ): Promise<void> {
    try {
      const client = await this.getAppGraphClient();

      // ── Step 1: Join the meeting via Graph Communications API ──
      await this.updateSession(session, {
        status: BotSessionStatus.INITIALIZING,
        progressMessage: 'Connecting to Teams meeting...',
        progressPercent: 10,
      });

      const botCallbackUrl = this.configService.get('botCallbackUrl', { infer: true }) as string;
      const tenantId = this.configService.get('azure.tenantId', { infer: true }) as string;
      this.logger.log(`Using bot callback URL: ${botCallbackUrl}`);
      this.logger.log(`Using tenant ID: ${tenantId}`);

      const meetingInfoParsed = this.parseJoinUrl(session.joinUrl);

      // ── Strategy 1: Join via organizerMeetingInfo (requires Oid in URL context) ──
      // The Teams join URL context parameter contains the organizer's AAD object ID.
      const joinByOrganizerPayload = meetingInfoParsed.organizerId
        ? {
            '@odata.type': '#microsoft.graph.call',
            callbackUri: botCallbackUrl,
            requestedModalities: ['audio'],
            mediaConfig: {
              '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
              preFetchMedia: [],
            },
            meetingInfo: {
              '@odata.type': '#microsoft.graph.organizerMeetingInfo',
              organizer: {
                '@odata.type': '#microsoft.graph.identitySet',
                user: {
                  '@odata.type': '#microsoft.graph.identity',
                  id: meetingInfoParsed.organizerId,
                  tenantId: meetingInfoParsed.organizerTenantId || tenantId,
                },
              },
            },
            tenantId,
          }
        : null;

      // ── Strategy 2: Join via chatInfo with thread ID ──
      const joinByChatPayload = {
        '@odata.type': '#microsoft.graph.call',
        callbackUri: botCallbackUrl,
        requestedModalities: ['audio'],
        mediaConfig: {
          '@odata.type': '#microsoft.graph.serviceHostedMediaConfig',
          preFetchMedia: [],
        },
        chatInfo: {
          '@odata.type': '#microsoft.graph.chatInfo',
          threadId: meetingInfoParsed.threadId,
          messageId: '0',
        },
        tenantId,
      };

      let callResponse: any;
      if (joinByOrganizerPayload) {
        try {
          this.logger.log('Attempting to join meeting via organizerMeetingInfo...');
          callResponse = await client
            .api('/communications/calls')
            .post(joinByOrganizerPayload);
        } catch (joinError: any) {
          this.logger.warn(
            `organizerMeetingInfo strategy failed: ${joinError?.message || joinError?.code}. Trying chatInfo strategy...`,
          );
        }
      }

      if (!callResponse) {
        try {
          this.logger.log('Attempting to join meeting via chatInfo...');
          callResponse = await client
            .api('/communications/calls')
            .post(joinByChatPayload);
        } catch (chatError: any) {
          this.logger.error(
            `chatInfo join strategy failed: ${chatError?.message || chatError?.code}`,
          );
          throw chatError;
        }
      }

      const callId = callResponse.id;

      await this.updateSession(session, {
        callId,
        status: BotSessionStatus.JOINED,
        joinedAt: new Date(),
        progressMessage: 'Bot has joined the meeting!',
        progressPercent: 25,
      });

      this.logger.log(`Bot joined meeting — callId: ${callId}`);

      // ── Step 2: Start recording ──
      // Use Graph's record action or Teams cloud recording
      await this.startRecording(client, callId, session);

      // ── Step 3: Poll for meeting end / call status ──
      this.startCallStatusPolling(
        client,
        callId,
        session,
        autoTranscribe,
        autoSummarize,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error joining meeting';

      await this.updateSession(session, {
        status: BotSessionStatus.ERROR,
        errorMessage,
        progressMessage: `Failed to join meeting: ${errorMessage}`,
        progressPercent: 0,
      });

      this.logger.error(`Bot failed to join meeting: ${errorMessage}`, error);
    }
  }

  // ─── Recording ───────────────────────────────────────────────────────

  /**
   * Start recording via the Graph Communications record action.
   * This asks Teams to record the call and stream media to the bot.
   */
  private async startRecording(
    client: Client,
    callId: string,
    session: BotSessionDocument,
  ): Promise<void> {
    try {
      // Request Teams to record the call
      await client
        .api(`/communications/calls/${callId}/recordResponse`)
        .post({
          bargeInAllowed: true,
          clientContext: `bot-session-${session._id}`,
          prompts: [],
          maxRecordDurationInSeconds: 7200, // 2 hours max
          initialSilenceTimeoutInSeconds: 300,
          maxSilenceTimeoutInSeconds: 120,
          playBeep: false,
          stopTones: [],
        });

      await this.updateSession(session, {
        status: BotSessionStatus.RECORDING,
        recordingStartedAt: new Date(),
        progressMessage: 'Recording meeting audio...',
        progressPercent: 30,
      });

      this.logger.log(`Recording started for call ${callId}`);
    } catch (recordError: any) {
      // If recordResponse isn't supported, try cloud recording via policy
      this.logger.warn(
        `recordResponse failed (${recordError?.message}), trying updateRecordingStatus...`,
      );

      try {
        await client
          .api(`/communications/calls/${callId}/updateRecordingStatus`)
          .post({ status: 'recording', clientContext: `bot-session-${session._id}` });

        await this.updateSession(session, {
          status: BotSessionStatus.RECORDING,
          recordingStartedAt: new Date(),
          progressMessage: 'Cloud recording started...',
          progressPercent: 30,
        });

        this.logger.log(`Cloud recording started for call ${callId}`);
      } catch (cloudError: any) {
        this.logger.warn(
          `Cloud recording also failed (${cloudError?.message}). ` +
          'The meeting may still have a Teams-side recording that can be retrieved later.',
        );

        // Even if we can't start recording from the bot, we stay in the meeting.
        // The user might have Teams recording enabled on their side.
        await this.updateSession(session, {
          status: BotSessionStatus.JOINED,
          progressMessage:
            'Bot joined but could not start recording. ' +
            'If Teams recording is enabled, the recording will be available after the meeting.',
          progressPercent: 25,
        });
      }
    }
  }

  // ─── Call Status Polling ──────────────────────────────────────────────

  /**
   * Poll the Graph call endpoint to detect when the meeting ends.
   * When the call terminates, download the recording and trigger the pipeline.
   */
  private startCallStatusPolling(
    client: Client,
    callId: string,
    session: BotSessionDocument,
    autoTranscribe: boolean,
    autoSummarize: boolean,
  ): void {
    const pollIntervalMs = 30_000; // Check every 30 seconds
    const sessionId = session._id.toString();

    const interval = setInterval(async () => {
      try {
        const call = await client
          .api(`/communications/calls/${callId}`)
          .get();

        const state = call?.state;

        if (state === 'terminated' || state === 'terminatedSelf') {
          this.logger.log(`Call ${callId} has ended (state: ${state})`);
          this.stopPolling(sessionId);
          await this.handleMeetingEnded(
            session,
            autoTranscribe,
            autoSummarize,
          );
        }
      } catch (error: any) {
        // A 404 means the call is gone → meeting ended
        if (error?.statusCode === 404 || error?.code === 'ItemNotFound') {
          this.logger.log(`Call ${callId} no longer exists — meeting ended`);
          this.stopPolling(sessionId);
          await this.handleMeetingEnded(
            session,
            autoTranscribe,
            autoSummarize,
          );
        } else {
          this.logger.warn(`Error polling call ${callId}:`, error?.message);
        }
      }
    }, pollIntervalMs);

    this.pollingIntervals.set(sessionId, interval);
  }

  private stopPolling(sessionId: string): void {
    const interval = this.pollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(sessionId);
    }
  }

  // ─── Meeting Ended → Download → Pipeline ─────────────────────────────

  /**
   * Called when the meeting ends. Downloads the recording, then triggers
   * the Whisper → GPT pipeline via TranscriptsService.
   */
  private async handleMeetingEnded(
    session: BotSessionDocument,
    autoTranscribe: boolean,
    autoSummarize: boolean,
  ): Promise<void> {
    try {
      await this.updateSession(session, {
        status: BotSessionStatus.RECORDING_COMPLETE,
        recordingEndedAt: new Date(),
        progressMessage: 'Meeting ended. Retrieving recording...',
        progressPercent: 50,
      });

      // Download the recording from Teams
      const recordingPath = await this.downloadCallRecording(session);

      if (!recordingPath) {
        // No recording file available — try the standard Teams recording path
        if (session.meetingId && autoTranscribe) {
          this.logger.log(
            'No direct recording available. Trying Teams recording via transcript service...',
          );
          await this.triggerTranscriptPipeline(
            session,
            autoTranscribe,
            autoSummarize,
          );
          return;
        }

        await this.updateSession(session, {
          status: BotSessionStatus.ERROR,
          errorMessage: 'No recording file could be retrieved after the meeting ended.',
          progressMessage: 'Failed to retrieve recording.',
          progressPercent: 0,
        });
        return;
      }

      await this.updateSession(session, {
        recordingFilePath: recordingPath.filePath,
        recordingSize: recordingPath.size,
        progressMessage: `Recording downloaded (${(recordingPath.size / 1024 / 1024).toFixed(1)} MB). Processing...`,
        progressPercent: 60,
      });

      // Trigger the full pipeline
      if (autoTranscribe) {
        await this.triggerTranscriptPipeline(
          session,
          autoTranscribe,
          autoSummarize,
        );
      } else {
        await this.updateSession(session, {
          status: BotSessionStatus.COMPLETED,
          completedAt: new Date(),
          progressMessage: 'Recording saved. Transcription was not requested.',
          progressPercent: 100,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown post-meeting error';

      await this.updateSession(session, {
        status: BotSessionStatus.ERROR,
        errorMessage,
        progressMessage: `Post-meeting processing failed: ${errorMessage}`,
        progressPercent: 0,
      });

      this.logger.error(`Post-meeting processing failed: ${errorMessage}`, error);
    }
  }

  /**
   * Download the recording produced by a Graph Communications call.
   */
  private async downloadCallRecording(
    session: BotSessionDocument,
  ): Promise<{ filePath: string; size: number } | null> {
    try {
      const client = await this.getAppGraphClient();

      // Try to get recording content from the call
      const callId = session.callId;
      if (!callId) return null;

      // Attempt to download via the recording content endpoint
      const response = await client
        .api(`/communications/calls/${callId}/content`)
        .responseType('arraybuffer' as any)
        .get();

      const fileName = `bot-recording-${session._id}-${Date.now()}.mp4`;
      const filePath = path.join(this.tempDir, fileName);
      const buffer = Buffer.from(response);

      fs.writeFileSync(filePath, buffer);
      const stats = fs.statSync(filePath);

      this.logger.log(
        `Recording downloaded: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      return { filePath, size: stats.size };
    } catch (error: any) {
      this.logger.warn(
        `Could not download recording directly from call: ${error?.message}`,
      );

      // Fallback: try to download via the standard Teams meeting recordings endpoint.
      // App-only tokens cannot use /me/ — we need the organizer's AAD user ID from the join URL.
      try {
        const client = await this.getAppGraphClient();
        const meetingParsed = this.parseJoinUrl(session.joinUrl);
        const organizerId = meetingParsed.organizerId;

        if (!organizerId) {
          this.logger.warn('Cannot fetch recordings: organizer AAD ID not found in join URL context.');
          return null;
        }

        const recordings = await client
          .api(`/users/${organizerId}/onlineMeetings/${session.microsoftMeetingId}/recordings`)
          .get();

        if (recordings?.value?.length > 0) {
          const recordingId = recordings.value[0].id;
          const recordingContent = await client
            .api(
              `/users/${organizerId}/onlineMeetings/${session.microsoftMeetingId}/recordings/${recordingId}/content`,
            )
            .responseType('arraybuffer' as any)
            .get();

          const fileName = `bot-recording-${session._id}-${Date.now()}.mp4`;
          const filePath = path.join(this.tempDir, fileName);
          const buffer = Buffer.from(recordingContent);

          fs.writeFileSync(filePath, buffer);
          const stats = fs.statSync(filePath);

          return { filePath, size: stats.size };
        }
      } catch (fallbackError) {
        this.logger.warn('Fallback recording download also failed', fallbackError);
      }

      return null;
    }
  }

  // ─── Transcript Pipeline Trigger ──────────────────────────────────────

  /**
   * Hand off to TranscriptsService for the Whisper → GPT pipeline.
   * If we have a meetingId, use the existing transcribeWithWhisper method.
   * Otherwise, fall back to a direct Whisper call on the file.
   */
  private async triggerTranscriptPipeline(
    session: BotSessionDocument,
    autoTranscribe: boolean,
    autoSummarize: boolean,
  ): Promise<void> {
    if (!session.meetingId) {
      this.logger.warn(
        'No meetingId linked to this bot session. Cannot run the transcript pipeline ' +
        'without a meeting record. Recording is saved for manual processing.',
      );

      await this.updateSession(session, {
        status: BotSessionStatus.COMPLETED,
        completedAt: new Date(),
        progressMessage:
          'Recording saved but no meeting record linked. Upload the recording manually to transcribe.',
        progressPercent: 100,
      });
      return;
    }

    try {
      await this.updateSession(session, {
        status: BotSessionStatus.TRANSCRIBING,
        progressMessage: 'Transcribing recording with OpenAI Whisper...',
        progressPercent: 65,
      });

      // Use the existing TranscriptsService pipeline
      // This handles: download recording → Whisper → GPT summary → save to DB
      const transcript = await this.transcriptsService.transcribeWithWhisper(
        session.userId.toString(),
        session.meetingId.toString(),
        autoSummarize,
      );

      await this.updateSession(session, {
        status: BotSessionStatus.COMPLETED,
        transcriptId: (transcript as any)._id
          ? new Types.ObjectId((transcript as any)._id.toString())
          : undefined,
        completedAt: new Date(),
        progressMessage: autoSummarize
          ? 'Recording transcribed and summarized successfully!'
          : 'Recording transcribed successfully!',
        progressPercent: 100,
      });

      this.logger.log(
        `Bot session ${session._id} completed — transcript ready`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Pipeline failed';

      await this.updateSession(session, {
        status: BotSessionStatus.ERROR,
        errorMessage,
        progressMessage: `Transcription pipeline failed: ${errorMessage}`,
        progressPercent: 0,
      });

      this.logger.error(`Transcript pipeline failed for bot session ${session._id}`, error);
    } finally {
      // Clean up local recording file
      if (session.recordingFilePath && fs.existsSync(session.recordingFilePath)) {
        try {
          fs.unlinkSync(session.recordingFilePath);
          this.logger.log(`Cleaned up recording: ${session.recordingFilePath}`);
        } catch {
          // Ignore cleanup failures
        }
      }
    }
  }

  // ─── Stop / Leave Meeting ─────────────────────────────────────────────

  /**
   * Manually stop the bot — it leaves the meeting and starts post-processing.
   */
  async stopSession(
    userId: string,
    sessionId: string,
    autoTranscribe = true,
    autoSummarize = true,
  ): Promise<BotSession> {
    const session = await this.botSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new BadRequestException('Bot session not found');
    }

    if (
      session.status === BotSessionStatus.COMPLETED ||
      session.status === BotSessionStatus.ERROR ||
      session.status === BotSessionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot stop a session that is already ${session.status}`,
      );
    }

    // Stop polling
    this.stopPolling(sessionId);

    // Leave the call via Graph
    if (session.callId) {
      try {
        const client = await this.getAppGraphClient();
        await client.api(`/communications/calls/${session.callId}`).delete();
        this.logger.log(`Bot left call ${session.callId}`);
      } catch (error: any) {
        this.logger.warn(
          `Failed to leave call ${session.callId}: ${error?.message}`,
        );
        // Continue with post-processing even if leave fails
      }
    }

    // Trigger post-meeting processing
    await this.handleMeetingEnded(session, autoTranscribe, autoSummarize);

    // Reload and return the updated session
    const updated = await this.botSessionModel.findById(sessionId);
    return updated!;
  }

  /**
   * Cancel a bot session without processing the recording.
   */
  async cancelSession(userId: string, sessionId: string): Promise<BotSession> {
    const session = await this.botSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new BadRequestException('Bot session not found');
    }

    // Stop polling
    this.stopPolling(sessionId);

    // Leave the call
    if (session.callId) {
      try {
        const client = await this.getAppGraphClient();
        await client.api(`/communications/calls/${session.callId}`).delete();
      } catch {
        // Ignore leave errors on cancel
      }
    }

    // Clean up recording file
    if (session.recordingFilePath && fs.existsSync(session.recordingFilePath)) {
      try {
        fs.unlinkSync(session.recordingFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    await this.updateSession(session, {
      status: BotSessionStatus.CANCELLED,
      progressMessage: 'Bot session cancelled by user.',
      progressPercent: 0,
    });

    return session;
  }

  // ─── Session Queries ──────────────────────────────────────────────────

  async getSession(userId: string, sessionId: string): Promise<BotSession | null> {
    return this.botSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    });
  }

  async getActiveSessions(userId: string): Promise<BotSession[]> {
    return this.botSessionModel.find({
      userId: new Types.ObjectId(userId),
      status: {
        $in: [
          BotSessionStatus.INITIALIZING,
          BotSessionStatus.JOINED,
          BotSessionStatus.RECORDING,
          BotSessionStatus.RECORDING_COMPLETE,
          BotSessionStatus.TRANSCRIBING,
          BotSessionStatus.SUMMARIZING,
        ],
      },
    }).sort({ createdAt: -1 });
  }

  async getSessionHistory(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ sessions: BotSession[]; total: number }> {
    const [sessions, total] = await Promise.all([
      this.botSessionModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.botSessionModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return { sessions, total };
  }

  // ─── Graph Webhook Callback ───────────────────────────────────────────

  /**
   * Handle incoming call state notifications from Microsoft Graph.
   * This is called by the callback URL registered when the bot joins.
   */
  async handleCallNotification(notification: any): Promise<void> {
    try {
      const callId = notification?.resourceData?.id;
      const state = notification?.resourceData?.state;

      if (!callId) return;

      const session = await this.botSessionModel.findOne({ callId });
      if (!session) {
        this.logger.debug(`Notification for unknown call: ${callId}`);
        return;
      }

      this.logger.log(`Call notification: ${callId} → ${state}`);

      if (state === 'established') {
        await this.updateSession(session, {
          status: BotSessionStatus.JOINED,
          joinedAt: new Date(),
          progressMessage: 'Bot connected to meeting.',
          progressPercent: 25,
        });
      } else if (state === 'terminated') {
        this.stopPolling(session._id.toString());
        await this.handleMeetingEnded(session, true, true);
      }
    } catch (error) {
      this.logger.error('Failed to handle call notification', error);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Parse a Teams join URL to extract the thread ID and organizer info.
   * The URL context parameter contains the organizer's AAD object ID (Oid) and tenant (Tid).
   */
  private parseJoinUrl(joinUrl: string): {
    threadId: string;
    organizerId?: string;
    organizerTenantId?: string;
  } {
    try {
      const decoded = decodeURIComponent(joinUrl);
      const threadMatch = decoded.match(/19:(.+?)@thread/);
      const threadId = threadMatch
        ? `19:${threadMatch[1]}@thread.v2`
        : joinUrl;

      let organizerId: string | undefined;
      let organizerTenantId: string | undefined;

      try {
        const url = new URL(joinUrl);
        const contextParam = url.searchParams.get('context');
        if (contextParam) {
          const context = JSON.parse(decodeURIComponent(contextParam));
          organizerId = context.Oid || context.oid;
          organizerTenantId = context.Tid || context.tid;
        }
      } catch {
        // ignore URL/JSON parse errors
      }

      return { threadId, organizerId, organizerTenantId };
    } catch {
      return { threadId: joinUrl };
    }
  }

  private extractThreadId(joinUrl: string): string {
    return this.parseJoinUrl(joinUrl).threadId;
  }

  private async updateSession(
    session: BotSessionDocument,
    updates: Partial<BotSession>,
  ): Promise<void> {
    Object.assign(session, updates, { updatedAt: new Date() });
    await session.save();

    // Emit event for real-time updates
    this.events.emit('session-update', {
      sessionId: session._id.toString(),
      ...updates,
    });
  }
}
