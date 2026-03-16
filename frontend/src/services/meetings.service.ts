import { apiClient } from './api';
import { Meeting, GetMeetingsParams, PaginatedResponse, ApiResponse } from '@/types';

export interface SyncMeetingsResponse {
  synced: number;
  created: number;
  updated: number;
}

export interface MeetingStatusResponse {
  id: string;
  transcriptStatus: string;
  summaryStatus: string;
}

class MeetingsService {
  public async getMeetings(
    params: GetMeetingsParams = {}
  ): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    if (params.status) {
      queryParams.append('status', params.status);
    }

    const query = queryParams.toString();
    const url = query ? `/meetings?${query}` : '/meetings';

    return apiClient.get<PaginatedResponse<Meeting>>(url);
  }

  public async getMeetingById(id: string): Promise<ApiResponse<Meeting>> {
    return apiClient.get<Meeting>(`/meetings/${id}`);
  }

  public async syncMeetings(): Promise<ApiResponse<SyncMeetingsResponse>> {
    return apiClient.post<SyncMeetingsResponse>('/meetings/sync');
  }

  public async checkMeetingStatus(
    id: string
  ): Promise<ApiResponse<MeetingStatusResponse>> {
    return apiClient.get<MeetingStatusResponse>(`/meetings/${id}/status`);
  }

  public async deleteMeeting(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/meetings/${id}`);
  }

  public async createMeeting(data: {
    subject: string;
    startDateTime: string;
    endDateTime: string;
    organizer: { name: string; email: string };
    participants?: { name: string; email: string }[];
  }): Promise<ApiResponse<Meeting>> {
    return apiClient.post<Meeting>('/meetings', data);
  }
}

export const meetingsService = new MeetingsService();
