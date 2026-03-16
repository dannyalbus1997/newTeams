import { apiClient } from './api';
import { Transcript, ApiResponse } from '@/types';

export interface UploadTranscriptResponse {
  id: string;
  meetingId: string;
  wordCount: number;
  duration?: number;
}

class TranscriptsService {
  public async getTranscript(meetingId: string): Promise<ApiResponse<Transcript>> {
    return apiClient.get<Transcript>(`/transcripts/${meetingId}`);
  }

  public async fetchTranscript(meetingId: string): Promise<ApiResponse<Transcript>> {
    return apiClient.post<Transcript>(`/transcripts/${meetingId}/fetch`);
  }

  public async uploadTranscript(
    meetingId: string,
    file: File,
    onProgress?: (progressEvent: ProgressEvent) => void
  ): Promise<ApiResponse<UploadTranscriptResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.uploadFile<UploadTranscriptResponse>(
      `/transcripts/${meetingId}/upload`,
      formData,
      onProgress
    );
  }

  public async deleteTranscript(meetingId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/transcripts/${meetingId}`);
  }

  public async searchTranscript(
    meetingId: string,
    query: string
  ): Promise<ApiResponse<{ results: string[] }>> {
    return apiClient.get(`/transcripts/${meetingId}/search`, {
      params: { q: query },
    });
  }
}

export const transcriptsService = new TranscriptsService();
