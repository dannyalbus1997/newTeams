import { baseApi } from './baseApi';
import { Meeting, GetMeetingsParams, PaginatedResponse, ApiResponse } from '@/types';

/** Backend returns Mongoose _id; ensure meeting has id for routes. */
function withMeetingId<T extends { _id?: string; id?: string }>(m: T): T & { id: string } {
  return { ...m, id: m.id ?? (m as { _id?: string })._id ?? '' } as T & { id: string };
}

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

export interface CreateMeetingRequest {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  organizer: { name: string; email: string };
  participants?: { name: string; email: string }[];
}

export const meetingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMeetings: builder.query<PaginatedResponse<Meeting>, GetMeetingsParams>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page !== undefined) queryParams.append('page', params.page.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.status) queryParams.append('status', params.status);

        const query = queryParams.toString();
        return query ? `/meetings?${query}` : '/meetings';
      },
      transformResponse: (response: ApiResponse<PaginatedResponse<Meeting>>) => {
        const raw = response.data!;
        return {
          ...raw,
          data: raw.data.map((m) => withMeetingId(m as Meeting & { _id?: string })),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Meeting' as const, id })),
              { type: 'Meetings', id: 'LIST' },
            ]
          : [{ type: 'Meetings', id: 'LIST' }],
    }),

    getMeetingById: builder.query<Meeting, string>({
      query: (id) => `/meetings/${id}`,
      transformResponse: (response: ApiResponse<Meeting>) =>
        withMeetingId((response.data ?? {}) as Meeting & { _id?: string }),
      providesTags: (_result, _error, id) => [{ type: 'Meeting', id }],
    }),

    syncMeetings: builder.mutation<SyncMeetingsResponse, void>({
      query: () => ({
        url: '/meetings/sync',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<SyncMeetingsResponse>) => response.data!,
      invalidatesTags: [{ type: 'Meetings', id: 'LIST' }],
    }),

    checkMeetingStatus: builder.query<MeetingStatusResponse, string>({
      query: (id) => `/meetings/${id}/status`,
      transformResponse: (response: ApiResponse<MeetingStatusResponse>) => response.data!,
    }),

    deleteMeeting: builder.mutation<void, string>({
      query: (id) => ({
        url: `/meetings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Meeting', id },
        { type: 'Meetings', id: 'LIST' },
      ],
    }),

    createMeeting: builder.mutation<Meeting, CreateMeetingRequest>({
      query: (data) => ({
        url: '/meetings',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Meeting>) => response.data!,
      invalidatesTags: [{ type: 'Meetings', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetMeetingsQuery,
  useLazyGetMeetingsQuery,
  useGetMeetingByIdQuery,
  useSyncMeetingsMutation,
  useCheckMeetingStatusQuery,
  useDeleteMeetingMutation,
  useCreateMeetingMutation,
} = meetingsApi;
