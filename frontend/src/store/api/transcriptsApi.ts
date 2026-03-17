import { baseApi } from './baseApi';
import { Transcript, ApiResponse } from '@/types';

export interface UploadTranscriptResponse {
  id: string;
  meetingId: string;
  wordCount: number;
  duration?: number;
}

export const transcriptsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTranscript: builder.query<Transcript, string>({
      query: (meetingId) => `/transcripts/${meetingId}`,
      transformResponse: (response: ApiResponse<Transcript>) => response.data!,
      providesTags: (_result, _error, meetingId) => [{ type: 'Transcript', id: meetingId }],
    }),

    fetchTranscriptFromMeeting: builder.mutation<Transcript, string>({
      query: (meetingId) => ({
        url: `/transcripts/${meetingId}/fetch`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<Transcript>) => response.data!,
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Transcript', id: meetingId },
        { type: 'Meeting', id: meetingId },
      ],
    }),

    deleteTranscript: builder.mutation<void, string>({
      query: (meetingId) => ({
        url: `/transcripts/${meetingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Transcript', id: meetingId },
        { type: 'Meeting', id: meetingId },
      ],
    }),

    searchTranscript: builder.query<{ results: string[] }, { meetingId: string; query: string }>({
      query: ({ meetingId, query }) => ({
        url: `/transcripts/${meetingId}/search`,
        params: { q: query },
      }),
      transformResponse: (response: ApiResponse<{ results: string[] }>) => response.data!,
    }),
  }),
});

// Note: uploadTranscript uses FormData with progress tracking,
// which requires axios. We keep it as a standalone thunk in the transcript slice.

export const {
  useGetTranscriptQuery,
  useLazyGetTranscriptQuery,
  useFetchTranscriptFromMeetingMutation,
  useDeleteTranscriptMutation,
  useSearchTranscriptQuery,
  useLazySearchTranscriptQuery,
} = transcriptsApi;
