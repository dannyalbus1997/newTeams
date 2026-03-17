import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Transcript, TranscriptDocument, TranscriptSource } from './schemas/transcript.schema';
import { UsersService } from '@/users/users.service';
import { MeetingsService } from '@/meetings/meetings.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import { RecordingsService } from '@/recordings/recordings.service';
import { WhisperService, TranscriptionProgress } from '@/whisper/whisper.service';
import { TranscriptStatus } from '@/meetings/schemas/meeting.schema';
import { AppConfig } from '@/config/configuration';
import { EventEmitter } from 'events';

interface StructuredEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface TranscriptionJobStatus {
  meetingId: string;
  status: 'pending' | 'downloading' | 'transcribing' | 'summarizing' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface SummaryResponse {
  overview: string;
  keyDiscussionPoints: Array<{
    topic: string;
    details: string;
    speakers: string[];
  }>;
  actionItems: Array<{
    description: string;
    assignee?: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  decisions: Array<{
    decision: string;
    context: string;
    madeBy?: string;
  }>;
  followUps: Array<{
    item: string;
    responsible?: string;
    deadline?: string;
  }>;
  sentiment: {
    overall: string;
    score: number;
  };
  topics: string[];
}

@Injectable()
export class TranscriptsService {
  private readonly logger = new Logger(TranscriptsService.name);
  private readonly openai: OpenAI;

  // In-memory job tracking for transcription progress
  private readonly activeJobs = new Map<string, TranscriptionJobStatus>();
  public readonly jobEvents = new EventEmitter();

  constructor(
    @InjectModel(Transcript.name)
    private transcriptModel: Model<TranscriptDocument>,
    private configService: ConfigService<AppConfig>,
    private usersService: UsersService,
    private meetingsService: MeetingsService,
    private microsoftGraphService: MicrosoftGraphService,
    private recordingsService: RecordingsService,
    private whisperService: WhisperService,
  ) {
    const apiKey = this.configService.get('openai.apiKey', { infer: true }) as string;
    this.openai = new OpenAI({ apiKey });
  }

  // ─── VTT / SRT Parsing ───────────────────────────────────────────────

  private parseVttContent(vttText: string): StructuredEntry[] {
    const entries: StructuredEntry[] = [];
    const lines = vttText.split('\n');

    let currentTimestamp = '';
    let currentSpeaker = '';
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
        continue;
      }

      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);

      if (timeMatch) {
        if (currentTimestamp && currentText) {
          entries.push({
            speaker: currentSpeaker || 'Speaker',
            timestamp: currentTimestamp,
            text: currentText.trim(),
          });
        }

        currentTimestamp = timeMatch[1];
        currentText = '';
      } else if (line && currentTimestamp) {
        if (line.includes(':')) {
          const [speaker, ...textParts] = line.split(':');
          currentSpeaker = speaker.trim();
          currentText = textParts.join(':').trim();
        } else {
          currentText += (currentText ? ' ' : '') + line;
        }
      }
    }

    if (currentTimestamp && currentText) {
      entries.push({
        speaker: currentSpeaker || 'Speaker',
        timestamp: currentTimestamp,
        text: currentText.trim(),
      });
    }

    return entries;
  }

  private parseSrtContent(srtText: string): StructuredEntry[] {
    const entries: StructuredEntry[] = [];
    const blocks = srtText.split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');

      if (lines.length < 3) {
        continue;
      }

      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

      if (timeMatch) {
        const timestamp = timeMatch[1].replace(',', '.');
        const text = lines.slice(2).join(' ');

        entries.push({
          speaker: 'Speaker',
          timestamp,
          text,
        });
      }
    }

    return entries;
  }

  // ─── OpenAI GPT Summarization ────────────────────────────────────────

  private getSummarySystemPrompt(): string {
    return `You are an expert meeting summarizer. Analyze the provided meeting transcript and generate a comprehensive summary in JSON format.

Your response must be valid JSON with the following structure:
{
  "overview": "A concise 2-3 sentence overview of the meeting",
  "keyDiscussionPoints": [
    {
      "topic": "Topic name",
      "details": "Detailed explanation of what was discussed",
      "speakers": ["Speaker name 1", "Speaker name 2"]
    }
  ],
  "actionItems": [
    {
      "description": "What needs to be done",
      "assignee": "Person responsible (optional)",
      "dueDate": "Due date if mentioned (optional)",
      "priority": "high|medium|low"
    }
  ],
  "decisions": [
    {
      "decision": "The decision made",
      "context": "Why this decision was made",
      "madeBy": "Who made the decision (optional)"
    }
  ],
  "followUps": [
    {
      "item": "Follow-up item",
      "responsible": "Person responsible (optional)",
      "deadline": "When it should be done (optional)"
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": 0.5
  },
  "topics": ["topic1", "topic2", "topic3"]
}

Important:
- Extract ALL action items and decisions
- Use actual names of speakers when mentioned
- Assign accurate priority levels to action items
- Identify and extract topics discussed
- Keep descriptions concise but comprehensive
- Ensure JSON is valid and properly formatted`;
  }

  /**
   * Summarize transcript content using OpenAI GPT-4o.
   * Returns structured summary data.
   */
  private async summarizeWithGpt(
    transcriptContent: string,
    meetingSubject?: string,
    meetingDate?: string,
    meetingDurationMinutes?: number,
  ): Promise<{
    summary: SummaryResponse;
    tokenUsage: { prompt: number; completion: number; total: number };
  }> {
    this.logger.log('Starting GPT summarization of transcript...');

    let userMessage = 'Please analyze this meeting transcript and provide a detailed summary:\n\n';

    if (meetingSubject) {
      userMessage += `Meeting Subject: ${meetingSubject}\n`;
    }
    if (meetingDate) {
      userMessage += `Meeting Date: ${meetingDate}\n`;
    }
    if (meetingDurationMinutes) {
      userMessage += `Duration: ${meetingDurationMinutes} minutes\n`;
    }

    userMessage += `\nTranscript:\n${transcriptContent}`;

    const model = this.configService.get('openai.model', { infer: true }) as string || 'gpt-4o';

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.getSummarySystemPrompt() },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new BadRequestException('OpenAI returned an empty summary response');
    }

    let summaryData: SummaryResponse;
    try {
      summaryData = JSON.parse(content);
    } catch (error) {
      this.logger.error('Failed to parse OpenAI summary response', error);
      throw new BadRequestException('Failed to parse summary response from OpenAI');
    }

    const tokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    this.logger.log(
      `Summarization completed — tokens used: ${tokenUsage.total}`,
    );

    return { summary: summaryData, tokenUsage };
  }

  // ─── Microsoft Graph Transcript Fetch ────────────────────────────────

  /**
   * Fetch transcript from Microsoft Graph (native Teams transcript).
   * After fetching, automatically summarizes with GPT.
   */
  async fetchTranscript(
    userId: string,
    meetingId: string,
    autoSummarize = true,
  ): Promise<Transcript> {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new BadRequestException('User not found');

      const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
      if (!meeting) throw new BadRequestException('Meeting not found');

      let onlineMeetingId = meeting.microsoftMeetingId;

      // Check if transcript already exists
      const existing = await this.transcriptModel.findOne({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
      });
      if (existing) return existing;

      const token = await this.usersService.getDecryptedAccessToken(user);

      // Resolve real Teams online meeting ID if it's a calendar ID (starts with AAMk)
      if (onlineMeetingId.startsWith('AAMk')) {
        if (meeting.joinUrl) {
          const resolved = await this.microsoftGraphService.getOnlineMeetingIdByJoinUrl(
            token,
            meeting.joinUrl,
          );
          if (resolved) onlineMeetingId = resolved;
        }

        if (onlineMeetingId.startsWith('AAMk')) {
          const onlineMeetings = await this.microsoftGraphService.getOnlineMeetings(token);
          const startMs = new Date(meeting.startDateTime).getTime();
          const match = onlineMeetings.find(
            (m) =>
              m.subject === meeting.subject &&
              Math.abs(new Date(m.startDateTime).getTime() - startMs) < 60_000,
          );
          if (match?.id) onlineMeetingId = match.id;
        }

        if (onlineMeetingId.startsWith('AAMk')) {
          throw new BadRequestException(
            'Could not resolve calendar event to a Teams online meeting ID. Use manual transcript or re-sync meeting.',
          );
        }
      }

      // Fetch transcript list
      const transcripts = await this.microsoftGraphService.getMeetingTranscripts(token, onlineMeetingId);
      if (!transcripts?.length) throw new BadRequestException('No transcript available');

      const transcriptMeta = transcripts[0];

      // Fetch transcript content
      const content = await this.microsoftGraphService.getTranscriptContent(
        token,
        onlineMeetingId,
        transcriptMeta.id,
      );

      // Parse structured content
      let structuredContent: StructuredEntry[] = [];
      if (transcriptMeta.contentFormat === 'vtt') {
        structuredContent = this.parseVttContent(content);
      } else if (transcriptMeta.contentFormat === 'srt') {
        structuredContent = this.parseSrtContent(content);
      } else {
        structuredContent = [{ speaker: 'Unknown', timestamp: '00:00:00.000', text: content }];
      }

      const wordCount = content.split(/\s+/).length;

      // Create transcript record
      const newTranscript = await this.transcriptModel.create({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        microsoftTranscriptId: transcriptMeta.id,
        content,
        structuredContent,
        language: 'en',
        source: TranscriptSource.MICROSOFT,
        wordCount,
        fetchedAt: new Date(),
      });

      // Auto-summarize with GPT
      if (autoSummarize) {
        try {
          const durationMinutes = meeting.endDateTime && meeting.startDateTime
            ? Math.round((new Date(meeting.endDateTime).getTime() - new Date(meeting.startDateTime).getTime()) / 60000)
            : undefined;

          const { summary, tokenUsage } = await this.summarizeWithGpt(
            content,
            meeting.subject,
            meeting.startDateTime?.toLocaleDateString?.() || undefined,
            durationMinutes,
          );

          newTranscript.summary = {
            ...summary,
            generatedAt: new Date(),
            tokenUsage,
          };
          newTranscript.isSummarized = true;
          await (newTranscript as any).save();

          this.logger.log(`Transcript fetched and summarized for meeting ${meetingId}`);
        } catch (summaryError) {
          this.logger.warn(
            `Transcript fetched but summarization failed for meeting ${meetingId}`,
            summaryError,
          );
          // Transcript is still saved — summary can be retried later
        }
      }

      return newTranscript;
    } catch (error) {
      this.logger.error(`Failed to fetch transcript for meeting ${meetingId}`, error);
      throw error;
    }
  }

  // ─── Whisper Transcription + GPT Summary Pipeline ────────────────────

  /**
   * Full pipeline: download recording → Whisper transcription → GPT summarization.
   * This downloads the meeting recording from Teams, transcribes it with OpenAI
   * Whisper, then summarizes with GPT-4o — all in one flow.
   */
  async transcribeWithWhisper(
    userId: string,
    meetingId: string,
    autoSummarize = true,
  ): Promise<Transcript> {
    const jobKey = `${userId}:${meetingId}`;

    // Check if there's already an active job
    const existingJob = this.activeJobs.get(jobKey);
    if (existingJob && existingJob.status !== 'completed' && existingJob.status !== 'error') {
      throw new BadRequestException(
        'A transcription job is already running for this meeting',
      );
    }

    // Initialize job status
    this.updateJobStatus(jobKey, {
      meetingId,
      status: 'pending',
      progress: 0,
      message: 'Starting transcription pipeline...',
      startedAt: new Date(),
    });

    let recordingFilePath: string | null = null;

    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new BadRequestException('User not found');

      const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
      let microsoftMeetingId = meeting.microsoftMeetingId;
      const accessToken = await this.usersService.getDecryptedAccessToken(user);

      // Resolve calendar event IDs (AAMk...) to online meeting IDs
      if (microsoftMeetingId.startsWith('AAMk')) {
        if (!meeting.joinUrl) {
          throw new BadRequestException(
            'This meeting has no Teams join URL — cannot download recording. ' +
            'Try re-syncing your meetings or upload a transcript manually.',
          );
        }
        const resolvedId = await this.microsoftGraphService.getOnlineMeetingIdByJoinUrl(
          accessToken,
          meeting.joinUrl,
        );
        if (!resolvedId) {
          throw new BadRequestException(
            'Could not resolve this calendar event to a Teams online meeting. ' +
            'The meeting may have been deleted, or you may not have permission.',
          );
        }
        microsoftMeetingId = resolvedId;
        this.logger.log(`Resolved calendar event to online meeting: ${resolvedId}`);
      }

      // Update meeting status to processing
      await this.meetingsService.updateMeetingTranscriptStatus(
        userId,
        meetingId,
        TranscriptStatus.PROCESSING,
      );

      // ── Step 1: Download recording ──
      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'downloading',
        progress: 10,
        message: 'Downloading meeting recording from Teams...',
        startedAt: existingJob?.startedAt || new Date(),
      });

      const recording = await this.recordingsService.downloadFirstRecording(
        accessToken,
        microsoftMeetingId,
      );

      if (!recording) {
        throw new BadRequestException(
          'No recording available for this meeting. Ensure the meeting was recorded in Teams.',
        );
      }

      recordingFilePath = recording.filePath;
      this.logger.log(
        `Recording downloaded: ${recording.fileName} (${(recording.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      // ── Step 2: Transcribe with Whisper ──
      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'transcribing',
        progress: 25,
        message: 'Transcribing audio with OpenAI Whisper...',
        startedAt: existingJob?.startedAt || new Date(),
      });

      const whisperResult = await this.whisperService.transcribe(
        recording.filePath,
        undefined, // auto-detect language
        (progress: TranscriptionProgress) => {
          this.updateJobStatus(jobKey, {
            meetingId,
            status: 'transcribing',
            progress: 25 + Math.round(progress.progress * 0.35),
            message: progress.message,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
            startedAt: existingJob?.startedAt || new Date(),
          });
        },
      );

      // ── Step 3: Summarize with GPT ──
      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'summarizing',
        progress: 65,
        message: 'Generating AI summary with GPT-4o...',
        startedAt: existingJob?.startedAt || new Date(),
      });

      let summaryData: any = null;
      let tokenUsage: any = null;

      if (autoSummarize) {
        try {
          const durationMinutes = meeting.endDateTime && meeting.startDateTime
            ? Math.round((new Date(meeting.endDateTime).getTime() - new Date(meeting.startDateTime).getTime()) / 60000)
            : undefined;

          const result = await this.summarizeWithGpt(
            whisperResult.text,
            meeting.subject,
            meeting.startDateTime?.toLocaleDateString?.() || undefined,
            durationMinutes,
          );
          summaryData = result.summary;
          tokenUsage = result.tokenUsage;
        } catch (summaryError) {
          this.logger.warn(
            `Whisper transcription succeeded but GPT summarization failed for meeting ${meetingId}`,
            summaryError,
          );
          // Continue without summary — it can be retried later
        }
      }

      // ── Step 4: Save transcript + summary ──
      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'processing',
        progress: 85,
        message: 'Saving transcript and summary...',
        startedAt: existingJob?.startedAt || new Date(),
      });

      const structuredContent = this.whisperService.convertToStructuredContent(
        whisperResult.segments,
      );

      const wordCount = whisperResult.text.split(/\s+/).length;

      // Delete existing transcript if any (to replace with Whisper version)
      await this.transcriptModel.deleteOne({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
      });

      const transcriptData: any = {
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        content: whisperResult.text,
        structuredContent,
        language: whisperResult.language,
        source: TranscriptSource.WHISPER,
        duration: whisperResult.duration,
        wordCount,
        fetchedAt: new Date(),
      };

      if (summaryData) {
        transcriptData.summary = {
          ...summaryData,
          generatedAt: new Date(),
          tokenUsage,
        };
        transcriptData.isSummarized = true;
      }

      const transcript = await this.transcriptModel.create(transcriptData);

      // Update meeting status
      await this.meetingsService.updateMeetingTranscriptStatus(
        userId,
        meetingId,
        TranscriptStatus.COMPLETED,
      );

      // ── Step 5: Done ──
      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'completed',
        progress: 100,
        message: summaryData
          ? 'Transcription and summarization completed successfully!'
          : 'Transcription completed (summarization skipped).',
        startedAt: existingJob?.startedAt || new Date(),
        completedAt: new Date(),
      });

      return transcript;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown transcription error';

      this.updateJobStatus(jobKey, {
        meetingId,
        status: 'error',
        progress: 0,
        message: `Transcription failed: ${errorMessage}`,
        error: errorMessage,
        startedAt: existingJob?.startedAt || new Date(),
      });

      try {
        await this.meetingsService.updateMeetingTranscriptStatus(
          userId,
          meetingId,
          TranscriptStatus.ERROR,
        );
      } catch {
        // Ignore status update failure
      }

      this.logger.error(
        `Whisper transcription failed for meeting ${meetingId}`,
        error,
      );
      throw error;
    } finally {
      if (recordingFilePath) {
        await this.recordingsService.cleanupRecording(recordingFilePath);
      }
    }
  }

  // ─── Smart Fetch (Microsoft first, Whisper fallback) ─────────────────

  /**
   * Smart transcription: try Microsoft Graph first, fall back to Whisper if no
   * native transcript is available but a recording exists.
   * Both paths auto-summarize with GPT.
   */
  async fetchOrTranscribe(
    userId: string,
    meetingId: string,
  ): Promise<Transcript> {
    const existing = await this.transcriptModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });

    if (existing) return existing;

    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new BadRequestException('User not found');

      const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
      let microsoftMeetingId = meeting.microsoftMeetingId;
      const accessToken = await this.usersService.getDecryptedAccessToken(user);

      if (microsoftMeetingId.startsWith('AAMk')) {
        if (!meeting.joinUrl) {
          throw new BadRequestException(
            'This meeting has no Teams join URL and cannot be resolved. ' +
            'Try re-syncing or upload a transcript manually.',
          );
        }
        const resolvedId = await this.microsoftGraphService.getOnlineMeetingIdByJoinUrl(
          accessToken,
          meeting.joinUrl,
        );
        if (!resolvedId) {
          throw new BadRequestException(
            'Could not resolve this calendar event to a Teams online meeting. ' +
            'The meeting may have been deleted, or you may not have permission.',
          );
        }
        microsoftMeetingId = resolvedId;
        this.logger.log(`Resolved calendar event to online meeting: ${resolvedId}`);
      }

      const hasNativeTranscript = await this.microsoftGraphService.checkTranscriptAvailability(
        accessToken,
        microsoftMeetingId,
      );

      if (hasNativeTranscript) {
        this.logger.log(`Native transcript available for meeting ${meetingId}, fetching...`);
        return this.fetchTranscript(userId, meetingId, true);
      }

      const hasRecording = await this.recordingsService.hasRecordings(
        accessToken,
        microsoftMeetingId,
      );

      if (hasRecording) {
        this.logger.log(
          `No native transcript for meeting ${meetingId}, but recording available. Using Whisper + GPT...`,
        );
        return this.transcribeWithWhisper(userId, meetingId, true);
      }

      throw new BadRequestException(
        'No transcript or recording available for this meeting.',
      );
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Failed to fetch or transcribe meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  // ─── Re-summarize an existing transcript ─────────────────────────────

  /**
   * Re-generate the GPT summary for an existing transcript.
   * Useful if summarization was skipped or the user wants a fresh summary.
   */
  async regenerateSummary(
    userId: string,
    meetingId: string,
  ): Promise<Transcript> {
    const transcript = await this.transcriptModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });

    if (!transcript) {
      throw new BadRequestException('No transcript found for this meeting');
    }

    const meeting = await this.meetingsService.getMeetingById(userId, meetingId);

    const durationMinutes = meeting?.endDateTime && meeting?.startDateTime
      ? Math.round((new Date(meeting.endDateTime).getTime() - new Date(meeting.startDateTime).getTime()) / 60000)
      : undefined;

    const { summary, tokenUsage } = await this.summarizeWithGpt(
      transcript.content,
      meeting?.subject,
      meeting?.startDateTime?.toLocaleDateString?.() || undefined,
      durationMinutes,
    );

    transcript.summary = {
      ...summary,
      generatedAt: new Date(),
      tokenUsage,
    };
    transcript.isSummarized = true;
    transcript.updatedAt = new Date();

    await (transcript as any).save();

    this.logger.log(`Summary regenerated for meeting ${meetingId}`);
    return transcript;
  }

  // ─── Job Status ──────────────────────────────────────────────────────

  getTranscriptionJobStatus(
    userId: string,
    meetingId: string,
  ): TranscriptionJobStatus | null {
    const jobKey = `${userId}:${meetingId}`;
    return this.activeJobs.get(jobKey) || null;
  }

  private updateJobStatus(
    jobKey: string,
    status: TranscriptionJobStatus,
  ): void {
    this.activeJobs.set(jobKey, status);
    this.jobEvents.emit('progress', { jobKey, ...status });
  }

  // ─── CRUD ────────────────────────────────────────────────────────────

  async getTranscript(meetingId: string): Promise<Transcript | null> {
    return this.transcriptModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
    });
  }

  async getTranscriptByUserId(
    userId: string,
    meetingId: string,
  ): Promise<Transcript | null> {
    return this.transcriptModel.findOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });
  }

  async uploadTranscript(
    userId: string,
    meetingId: string,
    fileContent: string,
    format: 'text' | 'vtt' | 'srt' = 'text',
    autoSummarize = true,
  ): Promise<Transcript> {
    try {
      const existingTranscript = await this.transcriptModel.findOne({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
      });

      let structuredContent: StructuredEntry[] = [];

      if (format === 'vtt') {
        structuredContent = this.parseVttContent(fileContent);
      } else if (format === 'srt') {
        structuredContent = this.parseSrtContent(fileContent);
      } else {
        structuredContent = [
          {
            speaker: 'Unknown',
            timestamp: '00:00:00.000',
            text: fileContent,
          },
        ];
      }

      const wordCount = fileContent.split(/\s+/).length;

      // Summarize the uploaded transcript
      let summaryData: any = null;
      let tokenUsage: any = null;

      if (autoSummarize) {
        try {
          const meeting = await this.meetingsService.getMeetingById(userId, meetingId);
          const durationMinutes = meeting?.endDateTime && meeting?.startDateTime
            ? Math.round((new Date(meeting.endDateTime).getTime() - new Date(meeting.startDateTime).getTime()) / 60000)
            : undefined;

          const result = await this.summarizeWithGpt(
            fileContent,
            meeting?.subject,
            meeting?.startDateTime?.toLocaleDateString?.() || undefined,
            durationMinutes,
          );
          summaryData = result.summary;
          tokenUsage = result.tokenUsage;
        } catch (summaryError) {
          this.logger.warn(
            `Upload succeeded but summarization failed for meeting ${meetingId}`,
            summaryError,
          );
        }
      }

      if (existingTranscript) {
        existingTranscript.content = fileContent;
        existingTranscript.structuredContent = structuredContent;
        existingTranscript.wordCount = wordCount;
        existingTranscript.source = TranscriptSource.MANUAL_UPLOAD;
        existingTranscript.fetchedAt = new Date();
        existingTranscript.updatedAt = new Date();

        if (summaryData) {
          existingTranscript.summary = {
            ...summaryData,
            generatedAt: new Date(),
            tokenUsage,
          };
          existingTranscript.isSummarized = true;
        }

        await existingTranscript.save();
        return existingTranscript;
      }

      const transcriptData: any = {
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        content: fileContent,
        structuredContent,
        language: 'en',
        source: TranscriptSource.MANUAL_UPLOAD,
        wordCount,
        fetchedAt: new Date(),
      };

      if (summaryData) {
        transcriptData.summary = {
          ...summaryData,
          generatedAt: new Date(),
          tokenUsage,
        };
        transcriptData.isSummarized = true;
      }

      const transcript = await this.transcriptModel.create(transcriptData);
      return transcript;
    } catch (error) {
      this.logger.error(
        `Failed to upload transcript for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  async deleteTranscript(
    userId: string,
    meetingId: string,
  ): Promise<void> {
    await this.transcriptModel.deleteOne({
      meetingId: new Types.ObjectId(meetingId),
      userId: new Types.ObjectId(userId),
    });
  }

  async getTranscriptStats(userId: string): Promise<{
    totalTranscripts: number;
    totalWords: number;
    averageWordCount: number;
    summarizedCount: number;
  }> {
    const transcripts = await this.transcriptModel.find({
      userId: new Types.ObjectId(userId),
    });

    const totalWords = transcripts.reduce((sum, t) => sum + t.wordCount, 0);
    const summarizedCount = transcripts.filter((t) => t.isSummarized).length;

    return {
      totalTranscripts: transcripts.length,
      totalWords,
      averageWordCount: transcripts.length > 0 ? Math.round(totalWords / transcripts.length) : 0,
      summarizedCount,
    };
  }
}
