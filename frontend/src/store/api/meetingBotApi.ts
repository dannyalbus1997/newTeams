import { baseApi } from './baseApi';
import {
  BotSession,
  JoinMeetingRequest,
  JoinMeetingResponse,
  BotSessionHistoryResponse,
} from '@/types';

export const meetingBotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Send the bot to join a Teams meeting and start recording.
     */
    joinMeeting: builder.mutation<JoinMeetingResponse, JoinMeetingRequest>({
      query: (body) => ({
        url: '/meeting-bot/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BotSession'],
    }),

    /**
     * Stop the bot — leaves meeting and triggers transcription pipeline.
     */
    stopBotSession: builder.mutation<
      { sessionId: string; status: string; message: string },
      { sessionId: string; transcribe?: boolean; summarize?: boolean }
    >({
      query: ({ sessionId, transcribe = true, summarize = true }) => ({
        url: `/meeting-bot/${sessionId}/stop`,
        method: 'POST',
        params: {
          transcribe: String(transcribe),
          summarize: String(summarize),
        },
      }),
      invalidatesTags: ['BotSession'],
    }),

    /**
     * Cancel the bot — leaves meeting without processing.
     */
    cancelBotSession: builder.mutation<
      { sessionId: string; status: string; message: string },
      string
    >({
      query: (sessionId) => ({
        url: `/meeting-bot/${sessionId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['BotSession'],
    }),

    /**
     * Get the current status of a specific bot session.
     */
    getBotSession: builder.query<BotSession, string>({
      query: (sessionId) => `/meeting-bot/${sessionId}`,
      providesTags: (_result, _error, sessionId) => [
        { type: 'BotSession', id: sessionId },
      ],
    }),

    /**
     * List all currently active bot sessions.
     */
    getActiveBotSessions: builder.query<
      { sessions: BotSession[]; count: number },
      void
    >({
      query: () => '/meeting-bot/active/list',
      providesTags: ['BotSession'],
    }),

    /**
     * List bot session history with pagination.
     */
    getBotSessionHistory: builder.query<
      BotSessionHistoryResponse,
      { limit?: number; offset?: number }
    >({
      query: ({ limit = 20, offset = 0 }) => ({
        url: '/meeting-bot/history/list',
        params: { limit, offset },
      }),
      providesTags: ['BotSession'],
    }),
  }),
});

export const {
  useJoinMeetingMutation,
  useStopBotSessionMutation,
  useCancelBotSessionMutation,
  useGetBotSessionQuery,
  useLazyGetBotSessionQuery,
  useGetActiveBotSessionsQuery,
  useGetBotSessionHistoryQuery,
} = meetingBotApi;
