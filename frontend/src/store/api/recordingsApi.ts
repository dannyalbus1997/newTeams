import { baseApi } from './baseApi';
import { ApiResponse } from '@/types';

export interface RecordingInfo {
  id: string;
  createdDateTime: string;
  recordingContentUrl?: string;
}

export interface RecordingsResponse {
  recordings: RecordingInfo[];
}

export const recordingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecordings: builder.query<RecordingInfo[], string>({
      query: (meetingId) => `/recordings/${meetingId}`,
      transformResponse: (response: ApiResponse<RecordingsResponse>) =>
        response.data?.recordings ?? [],
    }),
  }),
});

export const { useGetRecordingsQuery, useLazyGetRecordingsQuery } = recordingsApi;
