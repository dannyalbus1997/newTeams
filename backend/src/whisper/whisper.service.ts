import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppConfig } from '@/config/configuration';

export interface WhisperTranscriptionResult {
  text: string;
  segments: WhisperSegment[];
  language: string;
  duration: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface TranscriptionProgress {
  stage: 'preparing' | 'extracting_audio' | 'transcribing' | 'processing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
}

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;
  private readonly tempDir = path.join(os.tmpdir(), 'whisper-audio');
  private readonly maxFileSize: number;
  private readonly whisperModel: string;

  constructor(private configService: ConfigService<AppConfig>) {
    const apiKey = this.configService.get('openai.apiKey', { infer: true }) as string;

    this.openai = new OpenAI({ apiKey });
    this.maxFileSize = 25 * 1024 * 1024; // 25 MB — OpenAI Whisper API limit
    this.whisperModel = 'whisper-1';

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transcribe an audio/video file using OpenAI Whisper API.
   * Supports mp3, mp4, mpeg, mpga, m4a, wav, webm formats.
   *
   * If the file exceeds 25 MB, it will be split into chunks.
   */
  async transcribe(
    filePath: string,
    language?: string,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<WhisperTranscriptionResult> {
    this.logger.log(`Starting Whisper transcription for: ${filePath}`);

    onProgress?.({
      stage: 'preparing',
      progress: 5,
      message: 'Preparing audio file for transcription...',
    });

    const stats = fs.statSync(filePath);
    this.logger.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // If file is within limits, transcribe directly
    if (stats.size <= this.maxFileSize) {
      return this.transcribeSingleFile(filePath, language, onProgress);
    }

    // For larger files, split and transcribe in chunks
    return this.transcribeLargeFile(filePath, language, onProgress);
  }

  /**
   * Transcribe a single file (under 25 MB) using OpenAI Whisper API.
   */
  private async transcribeSingleFile(
    filePath: string,
    language?: string,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<WhisperTranscriptionResult> {
    onProgress?.({
      stage: 'transcribing',
      progress: 30,
      message: 'Sending audio to OpenAI Whisper for transcription...',
    });

    try {
      const fileStream = fs.createReadStream(filePath);

      const response = await this.openai.audio.transcriptions.create({
        file: fileStream,
        model: this.whisperModel,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
        ...(language && { language }),
      });

      onProgress?.({
        stage: 'processing',
        progress: 80,
        message: 'Processing transcription results...',
      });

      const result = this.processWhisperResponse(response);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Transcription completed successfully!',
      });

      this.logger.log(
        `Transcription completed: ${result.segments.length} segments, ${result.duration.toFixed(1)}s duration`,
      );

      return result;
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      this.logger.error('Whisper transcription failed', error);
      throw error;
    }
  }

  /**
   * For files larger than 25 MB, extract audio and split into chunks.
   * Uses ffmpeg if available, otherwise attempts direct transcription.
   */
  private async transcribeLargeFile(
    filePath: string,
    language?: string,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<WhisperTranscriptionResult> {
    onProgress?.({
      stage: 'extracting_audio',
      progress: 10,
      message: 'Extracting and compressing audio from recording...',
    });

    // Try to extract and compress audio using ffmpeg
    const audioPath = await this.extractAudio(filePath);

    if (audioPath) {
      const audioStats = fs.statSync(audioPath);

      if (audioStats.size <= this.maxFileSize) {
        // Compressed audio is small enough
        try {
          const result = await this.transcribeSingleFile(
            audioPath,
            language,
            onProgress,
          );
          await this.cleanupFile(audioPath);
          return result;
        } catch (error) {
          await this.cleanupFile(audioPath);
          throw error;
        }
      }

      // Still too large — split into chunks
      try {
        const result = await this.transcribeChunked(
          audioPath,
          language,
          onProgress,
        );
        await this.cleanupFile(audioPath);
        return result;
      } catch (error) {
        await this.cleanupFile(audioPath);
        throw error;
      }
    }

    // No ffmpeg available, try direct transcription (may fail if too large)
    this.logger.warn(
      'ffmpeg not available. Attempting direct transcription of large file — this may fail.',
    );
    return this.transcribeSingleFile(filePath, language, onProgress);
  }

  /**
   * Extract audio from a video file using ffmpeg.
   * Compresses to mono 16kHz MP3 for optimal Whisper performance.
   */
  private async extractAudio(videoPath: string): Promise<string | null> {
    const { execSync } = require('child_process');

    try {
      // Check if ffmpeg is available
      execSync('which ffmpeg', { stdio: 'ignore' });
    } catch {
      this.logger.warn('ffmpeg is not installed. Skipping audio extraction.');
      return null;
    }

    const audioFileName = `audio-${Date.now()}.mp3`;
    const audioPath = path.join(this.tempDir, audioFileName);

    try {
      // Extract audio, compress to mono 16kHz MP3 (optimal for Whisper)
      execSync(
        `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k "${audioPath}" -y`,
        { stdio: 'pipe', timeout: 300000 }, // 5-minute timeout
      );

      this.logger.log(`Audio extracted: ${audioPath}`);
      return audioPath;
    } catch (error) {
      this.logger.error('Failed to extract audio with ffmpeg', error);
      return null;
    }
  }

  /**
   * Split a large audio file into chunks and transcribe each.
   */
  private async transcribeChunked(
    audioPath: string,
    language?: string,
    onProgress?: (progress: TranscriptionProgress) => void,
  ): Promise<WhisperTranscriptionResult> {
    const { execSync } = require('child_process');

    // Get audio duration
    let totalDuration = 0;
    try {
      const durationOutput = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
        { encoding: 'utf-8' },
      );
      totalDuration = parseFloat(durationOutput.trim());
    } catch {
      totalDuration = 3600; // Default to 1 hour if detection fails
    }

    // Split into 10-minute chunks (produces files well under 25 MB at 64kbps)
    const chunkDuration = 600; // 10 minutes in seconds
    const numChunks = Math.ceil(totalDuration / chunkDuration);
    const chunkPaths: string[] = [];

    this.logger.log(
      `Splitting ${totalDuration.toFixed(0)}s audio into ${numChunks} chunks`,
    );

    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkDuration;
      const chunkPath = path.join(
        this.tempDir,
        `chunk-${Date.now()}-${i}.mp3`,
      );

      execSync(
        `ffmpeg -i "${audioPath}" -ss ${start} -t ${chunkDuration} -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k "${chunkPath}" -y`,
        { stdio: 'pipe', timeout: 120000 },
      );

      chunkPaths.push(chunkPath);
    }

    // Transcribe each chunk
    const allSegments: WhisperSegment[] = [];
    let fullText = '';
    let detectedLanguage = language || 'en';

    for (let i = 0; i < chunkPaths.length; i++) {
      const chunkProgress = 20 + Math.round((i / chunkPaths.length) * 60);

      onProgress?.({
        stage: 'transcribing',
        progress: chunkProgress,
        message: `Transcribing chunk ${i + 1} of ${chunkPaths.length}...`,
        estimatedTimeRemaining: (chunkPaths.length - i) * 30,
      });

      try {
        const result = await this.transcribeSingleFile(chunkPaths[i]);
        const timeOffset = i * chunkDuration;

        // Offset segment timestamps
        const offsetSegments = result.segments.map((seg) => ({
          ...seg,
          start: seg.start + timeOffset,
          end: seg.end + timeOffset,
        }));

        allSegments.push(...offsetSegments);
        fullText += (fullText ? ' ' : '') + result.text;
        if (result.language) {
          detectedLanguage = result.language;
        }
      } finally {
        await this.cleanupFile(chunkPaths[i]);
      }
    }

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: 'Transcription completed successfully!',
    });

    return {
      text: fullText,
      segments: allSegments,
      language: detectedLanguage,
      duration: totalDuration,
    };
  }

  /**
   * Process the raw Whisper API response into our structured format.
   */
  private processWhisperResponse(response: any): WhisperTranscriptionResult {
    const segments: WhisperSegment[] = (response.segments || []).map(
      (seg: any, index: number) => ({
        id: index,
        start: seg.start || 0,
        end: seg.end || 0,
        text: (seg.text || '').trim(),
      }),
    );

    return {
      text: response.text || '',
      segments,
      language: response.language || 'en',
      duration: response.duration || 0,
    };
  }

  /**
   * Convert Whisper segments to structured transcript entries
   * compatible with the existing transcript format.
   */
  convertToStructuredContent(
    segments: WhisperSegment[],
  ): { speaker: string; timestamp: string; text: string }[] {
    return segments.map((segment) => ({
      speaker: segment.speaker || 'Speaker',
      timestamp: this.formatTimestamp(segment.start),
      text: segment.text,
    }));
  }

  /**
   * Format seconds into HH:MM:SS.mmm timestamp string.
   */
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Clean up a temporary file.
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.warn(`Failed to clean up file: ${filePath}`, error);
    }
  }
}
