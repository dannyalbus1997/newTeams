import { apiClient } from './api';
import { Summary, PaginatedResponse, ApiResponse, ActionItem } from '@/types';

export interface SearchSummariesResponse {
  results: Array<{
    meetingId: string;
    meetingSubject: string;
    matches: string[];
  }>;
}

export interface UpdateActionItemRequest {
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'in_progress' | 'completed';
}

class SummariesService {
  public async getSummary(meetingId: string): Promise<ApiResponse<Summary>> {
    return apiClient.get<Summary>(`/summaries/${meetingId}`);
  }

  public async generateSummary(meetingId: string): Promise<ApiResponse<Summary>> {
    return apiClient.post<Summary>(`/summaries/${meetingId}/generate`);
  }

  public async regenerateSummary(
    meetingId: string,
    options?: {
      model?: string;
      language?: string;
    }
  ): Promise<ApiResponse<Summary>> {
    return apiClient.post<Summary>(`/summaries/${meetingId}/regenerate`, options);
  }

  public async searchSummaries(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<SearchSummariesResponse>> {
    return apiClient.get<SearchSummariesResponse>('/summaries/search', {
      params: { q: query, page, limit },
    });
  }

  public async exportPdf(meetingId: string): Promise<Blob> {
    return apiClient.getBlob(`/summaries/${meetingId}/export/pdf`);
  }

  public async updateActionItem(
    meetingId: string,
    itemIndex: number,
    data: UpdateActionItemRequest
  ): Promise<ApiResponse<Summary>> {
    return apiClient.patch<Summary>(
      `/summaries/${meetingId}/action-items/${itemIndex}`,
      data
    );
  }

  public async deleteSummary(meetingId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/summaries/${meetingId}`);
  }

  public async getAllSummaries(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Summary>>> {
    return apiClient.get<PaginatedResponse<Summary>>('/summaries', {
      params: { page, limit },
    });
  }
}

export const summariesService = new SummariesService();
