import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transcript, TranscriptDocument, TranscriptSource } from './schemas/transcript.schema';
import { UsersService } from '@/users/users.service';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';

interface StructuredEntry {
  speaker: string;
  timestamp: string;
  text: string;
}

@Injectable()
export class TranscriptsService {
  private readonly logger = new Logger(TranscriptsService.name);

  constructor(
    @InjectModel(Transcript.name)
    private transcriptModel: Model<TranscriptDocument>,
    private usersService: UsersService,
    private microsoftGraphService: MicrosoftGraphService,
  ) {}

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

  async fetchTranscript(
    userId: string,
    meetingId: string,
  ): Promise<Transcript> {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const existingTranscript = await this.transcriptModel.findOne({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
      });

      if (existingTranscript) {
        return existingTranscript;
      }

      const accessToken = await this.usersService.getDecryptedAccessToken(user);

      let content = '';
      let structuredContent: StructuredEntry[] = [];

      const transcripts = await this.microsoftGraphService.getMeetingTranscripts(
        accessToken,
        meetingId,
      );

      if (transcripts && transcripts.length > 0) {
        const transcript = transcripts[0];
        content = await this.microsoftGraphService.getTranscriptContent(
          accessToken,
          meetingId,
          transcript.id,
        );

        if (transcript.contentFormat === 'vtt') {
          structuredContent = this.parseVttContent(content);
        } else if (transcript.contentFormat === 'srt') {
          structuredContent = this.parseSrtContent(content);
        } else {
          structuredContent = [
            {
              speaker: 'Unknown',
              timestamp: '00:00:00.000',
              text: content,
            },
          ];
        }
      }

      const wordCount = content.split(/\s+/).length;

      const newTranscript = await this.transcriptModel.create({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        microsoftTranscriptId: transcripts[0]?.id,
        content,
        structuredContent,
        language: 'en',
        source: TranscriptSource.MICROSOFT,
        wordCount,
        fetchedAt: new Date(),
      });

      return newTranscript;
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcript for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

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

      if (existingTranscript) {
        existingTranscript.content = fileContent;
        existingTranscript.structuredContent = structuredContent;
        existingTranscript.wordCount = wordCount;
        existingTranscript.source = TranscriptSource.MANUAL_UPLOAD;
        existingTranscript.fetchedAt = new Date();
        existingTranscript.updatedAt = new Date();
        await existingTranscript.save();
        return existingTranscript;
      }

      const transcript = await this.transcriptModel.create({
        meetingId: new Types.ObjectId(meetingId),
        userId: new Types.ObjectId(userId),
        content: fileContent,
        structuredContent,
        language: 'en',
        source: TranscriptSource.MANUAL_UPLOAD,
        wordCount,
        fetchedAt: new Date(),
      });

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
  }> {
    const transcripts = await this.transcriptModel.find({
      userId: new Types.ObjectId(userId),
    });

    const totalWords = transcripts.reduce((sum, t) => sum + t.wordCount, 0);

    return {
      totalTranscripts: transcripts.length,
      totalWords,
      averageWordCount: transcripts.length > 0 ? Math.round(totalWords / transcripts.length) : 0,
    };
  }
}
