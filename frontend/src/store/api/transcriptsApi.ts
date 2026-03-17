import { baseApi } from './baseApi';
import { Transcript, ApiResponse, TranscriptionJobStatus } from '@/types';

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

    /**
     * Transcribe a meeting recording using OpenAI Whisper.
     * Used as a fallback when no native Teams transcript is available.
     */
    transcribeWithWhisper: builder.mutation<Transcript, string>({
      query: (meetingId) => ({
        url: `/transcripts/${meetingId}/transcribe-whisper`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<Transcript>) => response.data!,
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Transcript', id: meetingId },
        { type: 'Meeting', id: meetingId },
      ],
    }),

    /**
     * Smart fetch: tries Microsoft Graph first, falls back to Whisper.
     */
    smartFetchTranscript: builder.mutation<Transcript, string>({
      query: (meetingId) => ({
        url: `/transcripts/${meetingId}/smart-fetch`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<Transcript>) => response.data!,
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Transcript', id: meetingId },
        { type: 'Meeting', id: meetingId },
      ],
    }),

    /**
     * Get the current status of a Whisper transcription job.
     */
    getTranscriptionStatus: builder.query<TranscriptionJobStatus, string>({
      query: (meetingId) => `/transcripts/${meetingId}/transcription-status`,
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
  useTranscribeWithWhisperMutation,
  useSmartFetchTranscriptMutation,
  useGetTranscriptionStatusQuery,
  useLazyGetTranscriptionStatusQuery,
  useDeleteTranscriptMutation,
  useSearchTranscriptQuery,
  useLazySearchTranscriptQuery,
} = transcriptsApi;
