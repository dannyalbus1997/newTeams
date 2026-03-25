import { Injectable, Logger } from '@nestjs/common';
import { MicrosoftGraphService } from '@/common/services/microsoft-graph.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface RecordingDownloadResult {
  filePath: string;
  fileName: string;
  size: number;
  mimeType: string;
  recordingId: string;
}

export interface RecordingInfo {
  id: string;
  createdDateTime: string;
  recordingContentUrl?: string;
}

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'teams-recordings');

  constructor(private microsoftGraphService: MicrosoftGraphService) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Get available recordings for a meeting via Microsoft Graph.
   * Pass userMicrosoftId to use /users/{id}/... (required for app-only tokens).
   */
  async getRecordings(
    accessToken: string,
    meetingId: string,
    userMicrosoftId?: string,
  ): Promise<RecordingInfo[]> {
    try {
      const recordings = userMicrosoftId
        ? await this.microsoftGraphService.getRecordingsForUser(accessToken, userMicrosoftId, meetingId)
        : await this.microsoftGraphService.getRecordings(accessToken, meetingId);
      return recordings.map((r: any) => ({
        id: r.id,
        createdDateTime: r.createdDateTime,
        recordingContentUrl: r.recordingContentUrl,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get recordings for meeting ${meetingId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Download a specific recording from Microsoft Graph to a temporary file.
   * Returns the file path and metadata. The caller is responsible for cleanup.
   * Pass userMicrosoftId to use /users/{id}/... (required for app-only tokens).
   */
  async downloadRecording(
    accessToken: string,
    meetingId: string,
    recordingId: string,
    userMicrosoftId?: string,
  ): Promise<RecordingDownloadResult> {
    this.logger.log(
      `Downloading recording ${recordingId} for meeting ${meetingId}`,
    );

    try {
      const client = this.microsoftGraphService.getGraphClient(accessToken);

      const endpoint = userMicrosoftId
        ? `/users/${userMicrosoftId}/onlineMeetings/${meetingId}/recordings/${recordingId}/content`
        : `/me/onlineMeetings/${meetingId}/recordings/${recordingId}/content`;

      // Fetch the recording content as a stream
      const response = await client
        .api(endpoint)
        .responseType('arraybuffer' as any)
        .get();

      // Determine file extension from content type
      const mimeType = 'video/mp4'; // Teams recordings are typically MP4
      const extension = '.mp4';
      const fileName = `recording-${meetingId}-${recordingId}-${Date.now()}${extension}`;
      const filePath = path.join(this.tempDir, fileName);

      // Write buffer to temporary file
      const buffer = Buffer.from(response);
      fs.writeFileSync(filePath, buffer);

      const stats = fs.statSync(filePath);

      this.logger.log(
        `Recording downloaded: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
      );

      return {
        filePath,
        fileName,
        size: stats.size,
        mimeType,
        recordingId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to download recording ${recordingId} for meeting ${meetingId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Download the first available recording for a meeting.
   * Pass userMicrosoftId to use /users/{id}/... (required for app-only tokens).
   */
  async downloadFirstRecording(
    accessToken: string,
    meetingId: string,
    userMicrosoftId?: string,
  ): Promise<RecordingDownloadResult | null> {
    const recordings = await this.getRecordings(accessToken, meetingId, userMicrosoftId);

    if (!recordings || recordings.length === 0) {
      this.logger.warn(`No recordings found for meeting ${meetingId}`);
      return null;
    }

    return this.downloadRecording(
      accessToken,
      meetingId,
      recordings[0].id,
      userMicrosoftId,
    );
  }

  /**
   * Clean up a downloaded recording file.
   */
  async cleanupRecording(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Cleaned up recording file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to clean up recording file: ${filePath}`, error);
    }
  }

  /**
   * Clean up all temporary recording files.
   */
  async cleanupAllRecordings(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          fs.unlinkSync(filePath);
        }
        this.logger.log(
          `Cleaned up ${files.length} recording files from temp directory`,
        );
      }
    } catch (error) {
      this.logger.warn('Failed to clean up temp recording directory', error);
    }
  }

  /**
   * Check if a meeting has any available recordings.
   * Pass userMicrosoftId to use /users/{id}/... (required for app-only tokens).
   */
  async hasRecordings(
    accessToken: string,
    meetingId: string,
    userMicrosoftId?: string,
  ): Promise<boolean> {
    const recordings = await this.getRecordings(accessToken, meetingId, userMicrosoftId);
    return recordings.length > 0;
  }
}
