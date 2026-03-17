import { baseApi } from './baseApi';
import { Summary, PaginatedResponse, ApiResponse } from '@/types';

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

export interface RegenerateSummaryOptions {
  model?: string;
  language?: string;
}

export const summariesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSummary: builder.query<Summary, string>({
      query: (meetingId) => `/summaries/${meetingId}`,
      transformResponse: (response: ApiResponse<Summary>) => response.data!,
      providesTags: (_result, _error, meetingId) => [{ type: 'Summary', id: meetingId }],
    }),

    generateSummary: builder.mutation<Summary, string>({
      query: (meetingId) => ({
        url: `/summaries/${meetingId}/generate`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<Summary>) => response.data!,
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Summary', id: meetingId },
        { type: 'Meeting', id: meetingId },
      ],
    }),

    regenerateSummary: builder.mutation<Summary, { meetingId: string; options?: RegenerateSummaryOptions }>({
      query: ({ meetingId, options }) => ({
        url: `/summaries/${meetingId}/regenerate`,
        method: 'POST',
        body: options,
      }),
      transformResponse: (response: ApiResponse<Summary>) => response.data!,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Summary', id: meetingId }],
    }),

    searchSummaries: builder.query<SearchSummariesResponse, { query: string; page?: number; limit?: number }>({
      query: ({ query, page = 1, limit = 10 }) => ({
        url: '/summaries/search',
        params: { q: query, page, limit },
      }),
      transformResponse: (response: ApiResponse<SearchSummariesResponse>) => response.data!,
    }),

    updateActionItem: builder.mutation<Summary, { meetingId: string; itemIndex: number; data: UpdateActionItemRequest }>({
      query: ({ meetingId, itemIndex, data }) => ({
        url: `/summaries/${meetingId}/action-items/${itemIndex}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Summary>) => response.data!,
      invalidatesTags: (_result, _error, { meetingId }) => [{ type: 'Summary', id: meetingId }],
    }),

    deleteSummary: builder.mutation<void, string>({
      query: (meetingId) => ({
        url: `/summaries/${meetingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, meetingId) => [
        { type: 'Summary', id: meetingId },
        { type: 'Summaries', id: 'LIST' },
      ],
    }),

    getAllSummaries: builder.query<PaginatedResponse<Summary>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => ({
        url: '/summaries',
        params: { page, limit },
      }),
      transformResponse: (response: ApiResponse<PaginatedResponse<Summary>>) => response.data!,
      providesTags: [{ type: 'Summaries', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useLazyGetSummaryQuery,
  useGenerateSummaryMutation,
  useRegenerateSummaryMutation,
  useSearchSummariesQuery,
  useLazySearchSummariesQuery,
  useUpdateActionItemMutation,
  useDeleteSummaryMutation,
  useGetAllSummariesQuery,
} = summariesApi;
